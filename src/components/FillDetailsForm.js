import React, { useEffect, useRef, useState } from 'react'
import {
  Button, Card, CardContent, Container, Grid, IconButton, MenuItem,
  TextField, Typography
} from '@material-ui/core'
import { Add, Delete } from '@material-ui/icons'
import { Alert } from '@material-ui/lab'
import { useStyles } from '../styles'
import { useAuth } from '../AuthContext'
import { useDatabase } from '../DatabaseContext'

function FillDetailsForm() {

  const classes = useStyles()
  const { currentUser, currentUserData, checkCurrentUserData } = useAuth()
  const { updateProfileDetails } = useDatabase()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const name = useRef(null)
  const bio = useRef(null)
  const mturkId = useRef(null)
  const qualtricsId = useRef(null)
  const [gender, setGender] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [yearList, setYearList] = useState([])
  const [friendsList, setFriendsList] = useState(['', '', '', '', ''])

  useEffect(() => {
    var currentYear = new Date().getFullYear()
    var list = []
    for (var y = currentYear - 10; y >= 1950; y--)
      list.push(String(y))
    setYearList(list)

    // eslint-disable-next-line
  }, [])

  const handleGenderChange = (event) => {
    setGender(event.target.value)
  }

  const handleBirthYearChange = (event) => {
    setBirthYear(event.target.value)
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

  const doFillDetails = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      var userDetails = {
        email: currentUser.email,
        name: name.current.value,
        bio: bio.current.value,
        gender: gender,
        birthYear: Number(birthYear),
        mturkId: mturkId.current.value,
        qualtricsId: qualtricsId.current.value,
        friends: friendsList
      }

      // Upload profile details to database
      await updateProfileDetails(currentUser.uid, userDetails)

      await checkCurrentUserData()
    }
    catch (err) {
      console.log('Error:', err.name, err.message)
      setError('Some error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className='FillDetailsForm'>
      <Container maxWidth='sm'>

        {currentUserData.error ?

          <Alert severity='error'>
            Some error occurred. Please check if you're online.
          </Alert> :

          <Card elevation={2} className={classes.cardLoginSignup}>
            <CardContent>
              <Typography variant='h2' align='center' gutterBottom>
                Finish setting up your account
              </Typography>
              <hr className={classes.horizontalLine} />
              <form className={classes.form} onSubmit={doFillDetails}>
                <TextField
                  margin='normal'
                  fullWidth
                  id='email'
                  type='email'
                  label='Email'
                  disabled
                  value={currentUser.email}
                />
                <TextField
                  margin='normal'
                  required
                  fullWidth
                  id='name'
                  type='text'
                  label='Name'
                  autoFocus
                  inputRef={name}
                />
                <TextField
                  margin='normal'
                  required
                  fullWidth
                  multiline
                  id='bio'
                  type='text'
                  label='Your bio'
                  inputRef={bio}
                />
                <TextField
                  margin='normal'
                  select
                  required
                  fullWidth
                  id='gender'
                  label='Gender'
                  value={gender}
                  onChange={handleGenderChange}
                >
                  <MenuItem value='Mr.'>Mr.</MenuItem>
                  <MenuItem value='Ms.'>Ms.</MenuItem>
                </TextField>
                <TextField
                  margin='normal'
                  select
                  required
                  fullWidth
                  id='birth-year'
                  label='Birth year'
                  value={birthYear}
                  onChange={handleBirthYearChange}
                >
                  {yearList.map((year, key) => <MenuItem value={year} key={key}>{year}</MenuItem>)}
                </TextField>
                <TextField
                  margin='normal'
                  required
                  fullWidth
                  id='mturk-id'
                  type='text'
                  label='MTurk ID'
                  inputRef={mturkId}
                />
                <TextField
                  margin='normal'
                  required
                  fullWidth
                  id='qualtrics-id'
                  type='text'
                  label='Qualtrics ID'
                  inputRef={qualtricsId}
                />

                <Grid container spacing={1} style={{ marginTop: '8px' }}>
                  <Grid item xs={12}>
                    <Typography variant='body1' color='textSecondary'>
                      Please mention the names of your social media friends (atleast five):
                    </Typography>
                  </Grid>
                  {friendsList.map((name, i) => (
                    <Grid container item xs={12} justifyContent='space-between' key={i}>
                      <Grid item xs={10}>
                        <TextField
                          required
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
                  <Grid container item justifyContent='flex-end' xs={12}
                    style={{ margin: '8px 16px' }}
                  >
                    <Button
                      disabled={loading}
                      onClick={handleAddFriends}
                      variant='contained'
                      size='small'
                      style={{ textTransform: 'none' }}
                    >
                      <Add fontSize='small' />Add more friends
                    </Button>
                  </Grid>
                </Grid>

                {error &&
                  <Alert variant='outlined' severity='error' style={{ marginTop: '16px' }}>
                    {error}
                  </Alert>
                }

                <Button
                  type='submit'
                  fullWidth
                  variant='contained'
                  size='large'
                  color='primary'
                  disabled={loading}
                  className={classes.submitButton}
                >
                  Submit
                </Button>
              </form>
            </CardContent>
          </Card>
        }

      </Container>
    </div >
  )
}

export default FillDetailsForm
