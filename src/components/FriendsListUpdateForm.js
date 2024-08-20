import React, { useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, TextField } from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import { Add, Delete, Edit } from '@material-ui/icons'
import { useDatabase } from '../DatabaseContext'
import { useAuth } from '../AuthContext'

function FriendsListUpdateForm({ userId }) {

  const { currentUser } = useAuth()
  const { profiles, updateProfileDetails } = useDatabase()
  const profileRef = profiles[userId]

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({})
  const [friendsList, setFriendsList] = useState([])

  const handleOpen = () => {
    setFriendsList(profileRef.friends)
    setOpen(true)
  }

  const handleClose = () => {
    setMsg({})
    setLoading(false)
    setOpen(false)
  }

  const handleFriendNameChange = (event, index) => {
    let list = [...friendsList]
    list[index] = event.target.value
    setFriendsList(list)
  }

  const handleRemoveFriend = (index) => {
    let list = [...friendsList]
    list.splice(index, 1)
    setFriendsList(list)
  }

  const handleAddFriends = () => {
    setFriendsList([...friendsList, ''])
  }

  const handleSubmit = () => {
    if (currentUser.uid === userId) {
      setLoading(true)
      setMsg({})

      for (let name of friendsList) {
        if (name.length === 0) {
          setMsg({type: 'error', message: 'One or more fields are empty'})
          setLoading(false)
          return
        }
      }

      updateProfileDetails(userId, { friends: [...friendsList] })
        .then(_ => {
          setMsg({ type: 'success', message: 'Updated successfully' })
          setLoading(false)
        })
        .catch(err => {
          console.log(err.name, err.message)
          setMsg({ type: 'error', message: 'Some error occurred' })
          setLoading(false)
        })
    }
  }

  return (
    <>
      <Button variant='outlined' size='small' color='default'
        startIcon={<Edit />}
        onClick={handleOpen}
      >
        Edit friends list
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth='xs' fullWidth>

        <DialogTitle>Edit your friends list</DialogTitle>

        <DialogContent>
          <Grid container spacing={2}>

            {friendsList.map((name, i) => (
              <Grid container item xs={12} justifyContent='space-between' key={i}>
                <Grid item xs={10}>
                  <TextField
                    fullWidth
                    type='text'
                    label={`Name ${i + 1}`}
                    value={name}
                    onChange={e => handleFriendNameChange(e, i)}
                  />
                </Grid>
                {i >= 5 ?
                  <Grid item xs>
                    <IconButton
                      disabled={loading}
                      onClick={_ => handleRemoveFriend(i)}
                    >
                      <Delete />
                    </IconButton>
                  </Grid> :
                  <></>
                }
              </Grid>
            ))}

            <Grid container item xs={12} justifyContent='flex-end'>
              <Button
                disabled={loading}
                onClick={handleAddFriends}
                variant='outlined'
                size='small'
              >
                <Add fontSize='small' /> Add more
              </Button>
            </Grid>

            {msg.type &&
              <Grid container item xs={12} justifyContent='center'>
                <Alert severity={msg.type}>{msg.message}</Alert>
              </Grid>
            }
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} color='primary' disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} color='primary' disabled={loading}>
            Update
          </Button>
        </DialogActions>

      </Dialog>
    </>
  )
}

export default React.memo(FriendsListUpdateForm)
