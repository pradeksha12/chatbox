import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { db, FieldValue, Timestamp } from './firebase'
import { useAuth } from './AuthContext'
import { decideName } from './utils'

const DatabaseContext = createContext()

export function useDatabase() {
  return useContext(DatabaseContext)
}

export function DatabaseProvider({ children }) {

  const { currentUser, currentUserData } = useAuth()
  const [posts, setPosts] = useState({})
  const [profiles, setProfiles] = useState({})
  const [loadingInitials, setLoadingInitials] = useState(true)
  const postsRef = useRef()
  const instanceVersion = useRef()
  const lastPost = useRef()
  const noMorePosts = useRef(false)
  const loadingMorePosts = useRef(false)

  const updateProfileDetails = async (userId, userDetails) => {
    try {
      var ref = db.collection('users').doc(userId)
      var { exists } = await ref.get()

      if (exists)
        await ref.update(userDetails)

      else {
        // Upload new user's details

        // 1. Get total user count
        let { docs } = await db.collection('userCount').get()
        let count = 0
        for (let d of docs) {
          count += d.data().count
        }
        count = Number.parseInt(count)

        // 2. Calculate redirectInstance and version
        const TOTAL_VERSIONS = 3
        const TOTAL_SUBVERSIONS = 1
        const TOTAL_INSTANCES = TOTAL_VERSIONS * TOTAL_SUBVERSIONS

        const redirectInstance = count % TOTAL_INSTANCES

        /* Version can be:
         * 1: nothing to be shown
         * 2: only counts of shares, flags, views to be shown
         * 3: in addition to counts, friend's activity also to be shown
         */
        let version = Math.floor(redirectInstance / TOTAL_SUBVERSIONS) + 1

        // 3. Upload details
        await ref.set({
          ...userDetails,
          redirectInstance,
          version,
          count,
          createdAt: Timestamp.now()
        })

        // 4. Increment user count
        let randomIndex = Math.floor(Math.random() * 5).toString()
        let counterRef = db.collection('userCount').doc(randomIndex)
        let counterExists = (await counterRef.get()).exists
        if (counterExists)
          await counterRef.update({ count: FieldValue.increment(1) })
        else
          await counterRef.set({ count: 1 })
      }
    }
    catch (err) {
      console.log('Error uploading user details to firestore')
      throw err
    }

    // Get currently stored profile data in the profiles state variable
    // and update with new details
    var profileData = Object.assign({}, profiles[userId])
    Object.assign(profileData, userDetails)
    var profileObj = {}
    profileObj[userId] = { ...profileData, userId: userId }
    setProfiles(prevProfiles => ({ ...prevProfiles, ...profileObj }))
  }

  const loadProfile = async (userId) => {
    try {
      var userData = (await db.collection('users').doc(userId).get()).data()

      if (!userData) {
        console.log('User data not available')
        return
      }
    }
    catch (err) {
      console.log('Error loading profile details of user id:', userId)
      throw err
    }

    if (userData.fake === true) {
      let myProfile = profiles[currentUser.uid]
      if (!myProfile) {
        try {
          myProfile = (await db.collection('users').doc(currentUser.uid).get()).data()
        }
        catch (err) {
          console.log('loadProfile() - Error loading profile details of current user')
          throw err
        }
      }
      let namesList = userData.names
      let myList = [myProfile.name, ...myProfile.friends]
      userData.name = decideName(namesList, myList)
      userData.email = userData.name.split(' ')[0] + userData.email
      delete userData.names
    }

    var newUserObj = {}
    newUserObj[userId] = { ...userData, userId: userId }
    setProfiles(prevProfiles => ({ ...prevProfiles, ...newUserObj }))
  }

  const sharePost = async (postId) => {
    var oldPost = posts[postId]
    var orgPostId = oldPost.orgPostId
    var currentPostId = oldPost.postId

    try {
      // Add a 'shared' event to the original post
      await postsRef.current.doc(orgPostId).collection('events')
        .add({
          type: 'shared',
          orgPostId: orgPostId,
          throughPostId: currentPostId,
          newPostId: '',  // no new post
          sharer: currentUser.uid,
          timestamp: Timestamp.now()
        })
    }
    catch (err) {
      throw new Error('Couldn\'t add share event')
    }

    // Update sharers set of original post in the posts state variable
    var postObj = {}
    postObj[orgPostId] = Object.assign({}, posts[orgPostId])
    postObj[orgPostId].sharers.add(currentUser.uid)
    setPosts(prevPosts => ({ ...prevPosts, ...postObj }))
  }

  const viewPost = async (postId) => {
    var post = posts[postId]
    var orgPostId = post.orgPostId
    var currentPostId = post.postId

    // Author of original post can't increment view count
    if (posts[orgPostId].creator === currentUser.uid)
      return

    try {
      var eventsRef = postsRef.current.doc(orgPostId).collection('events')

      // Get the list of views of original post by current user
      var { docs } = await eventsRef.where('type', '==', 'viewed').where('viewer', '==', currentUser.uid).get()

      if (docs.length > 0) // User had viewed the post earlier
        return

      // Add a view event to firestore
      await eventsRef.add({
        type: 'viewed',
        orgPostId: orgPostId,
        throughPostId: currentPostId,
        viewer: currentUser.uid,
        timestamp: Timestamp.now()
      })
    }
    catch (err) {
      console.log('Error setting view for the post', err.name, err.message)
      throw err
    }

    // Update viewers set of original post in the posts state variable
    var postObj = {}
    postObj[orgPostId] = Object.assign({}, posts[orgPostId])
    postObj[orgPostId].viewers.add(currentUser.uid)
    setPosts(prevPosts => ({ ...prevPosts, ...postObj }))
  }

  const toggleFlagPost = async (postId, action) => {
    var post = posts[postId]
    var orgPostId = post.orgPostId
    var currentPostId = post.postId

    try {

      var eventsRef = postsRef.current.doc(orgPostId).collection('events')

      if (action === 'flag') {
        // Add a flag event to firestore
        await eventsRef.add({
          type: 'flagged',
          orgPostId: orgPostId,
          throughPostId: currentPostId,
          flagger: currentUser.uid,
          timestamp: Timestamp.now()
        })
      }

      else if (action === 'unflag') {
        var { docs } = await eventsRef.where('type', '==', 'flagged').where('flagger', '==', currentUser.uid).get()
        for (let d of docs) {
          await eventsRef.doc(d.id).delete()
        }
      }
    }
    catch (err) {
      console.log('Error toggling flag for the post', err.name, err.message)
      throw err
    }

    // Update flaggers set of original post in the posts state variable
    var postObj = {}
    postObj[orgPostId] = Object.assign({}, posts[orgPostId])
    if (action === 'flag') postObj[orgPostId].flaggers.add(currentUser.uid)
    else if (action === 'unflag') postObj[orgPostId].flaggers.delete(currentUser.uid)
    setPosts(prevPosts => ({ ...prevPosts, ...postObj }))
  }

  const loadPost = async (postId, postData) => {
    try {
      var postRef = postsRef.current.doc(postId)
      var docData = postData || (await postRef.get()).data()

      if (!docData) {
        console.log('Post doesn\'t exist')
        return
      }

      // IMPORTANT: Load original post first before loading current post data
      if (docData.type === 'shared' && !posts[docData.orgPostId])
        await loadPost(docData.orgPostId)
    }
    catch (err) {
      console.log('Error fetching post with id', postId, err.name, err.message)
      throw err
    }

    try {
      // Load profile details of post's creator (if not already loaded)
      if (!profiles[docData.creator])
        await loadProfile(docData.creator)
    }
    catch (err) {
      throw err
    }

    // Create new post object to be added to posts state variable
    var newPostObj = {}
    newPostObj[postId] = {
      ...docData,
      createdAt: new Date(docData.createdAt.seconds * 1000)
    }

    if (docData.type === 'original') {
      try {
        let viewers, sharers, flaggers

        // Decide viewers set
        if (instanceVersion.current === 1) {
          viewers = new Set()
        }
        else if (instanceVersion.current === 2 || instanceVersion.current === 3) {
          let { docs } = await postRef.collection('events').where('type', '==', 'viewed').where('viewer', '==', currentUser.uid).get()
          viewers = new Set(docs.map(a => a.data().viewer))
        }
        else {
          throw new Error('Unrecognized instance version')
        }

        // Decide sharers set
        if (instanceVersion.current === 1) {
          sharers = new Set()
        }
        else if (instanceVersion.current === 2) {
          let { docs } = await postRef.collection('events').where('type', '==', 'shared').where('sharer', '==', currentUser.uid).get()
          sharers = new Set(docs.map(a => a.data().sharer))
        }
        else if (instanceVersion.current === 3) {
          let { docs } = await postRef.collection('events').where('type', '==', 'shared').get()
          sharers = new Set(docs.map(a => a.data().sharer))

          // Load profile details of all sharers
          sharers.forEach(a => {
            if (!profiles[a]) {
              loadProfile(a)
                .catch(err => console.log('Error loading profile of user id', a))
            }
          })
        }
        else {
          throw new Error('Unrecognized instance version')
        }

        // Decide flaggers set
        if (instanceVersion.current === 1 || instanceVersion.current === 2) {
          let { docs } = await postRef.collection('events').where('type', '==', 'flagged').where('flagger', '==', currentUser.uid).get()
          flaggers = new Set(docs.map(a => a.data().flagger))
        }
        else if (instanceVersion.current === 3) {
          let { docs } = await postRef.collection('events').where('type', '==', 'flagged').get()
          flaggers = new Set(docs.map(a => a.data().flagger))

          // Load profile details of all flaggers
          flaggers.forEach(a => {
            if (!profiles[a]) {
              loadProfile(a)
                .catch(err => console.log('Error loading profile of user id', a))
            }
          })
        }
        else {
          throw new Error('Unrecognized instance version')
        }

        newPostObj[postId].viewers = viewers
        newPostObj[postId].sharers = sharers
        newPostObj[postId].flaggers = flaggers
      }
      catch (err) {
        console.log('Couldn\'t load events of post id', postId)
        throw err
      }
    }

    // Add to the posts state variable
    setPosts(prevPosts => ({ ...prevPosts, ...newPostObj }))
  }

  const loadPosts = async () => {
    if (loadingMorePosts.current === true) {
      return
    }
    if (noMorePosts.current === true) {
      return
    }

    try {

      loadingMorePosts.current = true

      var { docs } = await postsRef.current
        .orderBy('createdAt', 'desc')
        .startAfter(lastPost.current || '')
        .limit(6)
        .get()

      for (let i = 0; i < docs.length; i++) {
        if (!posts[docs[i].id])
          await loadPost(docs[i].id, docs[i].data())
      }

      lastPost.current = docs[docs.length - 1]
      if (docs.length === 0)
        noMorePosts.current = true
    }
    catch (err) {
      console.log('Couldn\'t load posts')
      throw err
    }
    finally {
      loadingMorePosts.current = false
    }
  }

  useEffect(() => {
    const loadInitials = async () => {
      setLoadingInitials(true)
      try {
        // Load profile details of current user
        await loadProfile(currentUser.uid)
        // Load initial posts
        await loadPosts()
        // Convey that initials are loaded
        setLoadingInitials(false)
      }
      catch (err) {
        console.log('Error from useEffect of DatabaseContext')
        console.log(err.name, err.message)
      }
    }

    if (currentUserData.exists === true) {
      postsRef.current = db.collection(`posts_${currentUserData.redirectInstance}`)
      instanceVersion.current = currentUserData.version
      loadInitials()
    }
    else {
      // Reset the state variables
      setPosts({})
      // setProfiles({})  Keep the profiles
      setLoadingInitials(true)
      postsRef.current = undefined
      instanceVersion.current = undefined
      lastPost.current = undefined
      noMorePosts.current = false
      loadingMorePosts.current = false
    }

    // eslint-disable-next-line
  }, [currentUserData])

  return (
    <DatabaseContext.Provider value={{
      posts,
      profiles,
      loadingInitials,
      updateProfileDetails,
      loadProfile,
      sharePost,
      viewPost,
      toggleFlagPost,
      loadPost,
      loadPosts,
    }}>
      {children}
    </DatabaseContext.Provider>
  )
}
