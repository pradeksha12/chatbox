export function getLocalDateTime(dateObj) {
  return dateObj.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  })
}

export function getAge(birthYear) {
  return String(new Date().getFullYear() - Number(birthYear))
}

// Returns length of LCS for X[0..m-1], Y[0..n-1]
function lcs(X, Y) {
  var m = X.length
  var n = Y.length
  var L = new Array(m + 1);
  for (let i = 0; i < L.length; i++) {
    L[i] = new Array(n + 1);
  }

  var i, j;

  /* Following steps build L[m+1][n+1] in
  bottom up fashion. Note that L[i][j]
  contains length of LCS of X[0..i-1]
  and Y[0..j-1] */
  for (i = 0; i <= m; i++) {
    for (j = 0; j <= n; j++) {
      if (i === 0 || j === 0)
        L[i][j] = 0;
      else if (X[i - 1] === Y[j - 1])
        L[i][j] = L[i - 1][j - 1] + 1;
      else
        L[i][j] = Math.max(L[i - 1][j], L[i][j - 1]);
    }
  }

  /* L[m][n] contains length of LCS
  for X[0..n-1] and Y[0..m-1] */
  return L[m][n];
}

export function match(someList, friendsList) {
  var lowerA = someList.map(x => x.name.toLowerCase())
  var lowerB = friendsList.map(y => y.toLowerCase())

  // var result = []

  for (let i = 0; i < lowerA.length; i++) {
    for (let j = 0; j < lowerB.length; j++) {
      let x = lowerA[i]
      let y = lowerB[j]
      if (lcs(x, y) >= 0.9 * Math.min(x.length, y.length)) {
        // As soon as one name matches, return it
        return someList[i]

        // result.push(someList[i])
        // return result
      }
    }
  }

  // return result
}

export function decideName(options, myList) {
  let options_fNames = options.map(name => name.toLowerCase().split(' ')[0])
  let myList_fNames = myList.map(name => name.toLowerCase().split(' ')[0])

  let length = options.length

  for (let i = 0; i < length; i++) {
    let name = options_fNames[i]
    if (!myList_fNames.includes(name)) {
      return options[i]
    }
  }

  return options[0]
}
