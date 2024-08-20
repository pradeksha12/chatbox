import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth, db } from './firebase'
import { LinearProgress } from '@material-ui/core'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {

  const [currentUser, setCurrentUser] = useState()
  const [loaded, setLoaded] = useState(false)
  const [currentUserData, setCurrentUserData] = useState({ exists: false, error: '' })
  const [currentUserDataLoading, setCurrentUserDataLoading] = useState(false)

  const signup = (email, password) => {
    return auth.createUserWithEmailAndPassword(email, password)
  }

  const login = (email, password) => {
    return auth.signInWithEmailAndPassword(email, password)
  }

  const logout = () => {
    return auth.signOut()
  }

  const resetPassword = (email) => {
    return auth.sendPasswordResetEmail(email)
  }

  const checkCurrentUserData = async () => {
    if (currentUser) {
      try {
        let doc = await db.collection('users').doc(currentUser.uid).get()

        if (doc.exists) {
          // User exists

          setCurrentUserData({
            exists: true,
            error: '',
            redirectInstance: doc.data().redirectInstance,
            version: doc.data().version,
          })
        }

        else {
          // User doesn't exist

          setCurrentUserData({ exists: false, error: '', })
        }
      }
      catch (err) {
        throw err
      }
    }
  }

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user)
      setLoaded(true)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    async function fetchData() {
      setCurrentUserDataLoading(true)
      try {
        await checkCurrentUserData()
      }
      catch (err) {
        setCurrentUserData({ exists: false, error: 'Couldn\'t fetch current user data' })
        console.log('Error fetching current user data from database:')
        console.log(err)
      }
      finally {
        setCurrentUserDataLoading(false)
      }
    }

    if (currentUser) {
      console.log('Fetching current user data')
      fetchData()
    }
    else {
      setCurrentUserData({ exists: false, error: '' })
    }
  }, // eslint-disable-next-line
    [currentUser]
  )

  return (
    <AuthContext.Provider value={{
      currentUser,
      currentUserData,
      currentUserDataLoading,
      signup,
      login,
      logout,
      resetPassword,
      checkCurrentUserData,
    }}>
      {loaded ?
        children :
        <LinearProgress color='secondary' />
      }
    </AuthContext.Provider>
  )
}
