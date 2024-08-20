import React, { useEffect } from 'react'
import { CircularProgress, Container } from '@material-ui/core'
import { useAuth } from '../AuthContext'
import { useDatabase } from '../DatabaseContext'
import PostCard from './PostCard'

function PostsList() {

  const { currentUser } = useAuth()
  const { loadingInitials, posts, loadPosts } = useDatabase()

  const handleScroll = () => {
    // Prevent unintentional function calling during page transitions
    if (document.documentElement.offsetHeight < window.innerHeight)
      return

    // Trigger function when user reaches 240 pixels from the bottom of the page
    if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 240) {
      loadPosts()
        .catch(err => console.log(err.name, err.message))
    }
  }

  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    return _ => window.removeEventListener('scroll', handleScroll)

    // eslint-disable-next-line
  }, [])

  return (
    <div className='PostsList' style={{ marginBottom: '90px' }}>
      <Container maxWidth='md'>
        {loadingInitials ?
          <div style={{ textAlign: 'center' }}>
            <CircularProgress color='secondary' />
          </div> :
          Object.values(posts)
            .sort((a, b) => b.createdAt - a.createdAt)
            .map(({ postId }) => <PostCard postId={postId} key={postId} myUid={currentUser.uid} />)
        }
      </Container>
    </div>
  )
}

export default PostsList
