const rimraf = require('rimraf')
const fs = require('fs-extra')
const join = require('path').join
const cwd = process.cwd()
const pkgJSON = require(join(cwd, 'package.json'))

if (pkgJSON.private) {
  return
}

var promiseAllWait = function (promises) {
  // this is the same as Promise.all(), except that it will wait for all promises to fulfill before rejecting
  var all_promises = []
  for (var i_promise = 0; i_promise < promises.length; i_promise++) {
    all_promises.push(
      promises[i_promise]
        .then(function (res) {
          return { res: res }
        })
        .catch(function (err) {
          return { err: err }
        })
    )
  }

  return Promise.all(all_promises).then(function (results) {
    return new Promise(function (resolve, reject) {
      var is_failure = false
      var i_result
      for (i_result = 0; i_result < results.length; i_result++) {
        if (results[i_result].err) {
          is_failure = true
          break
        } else {
          results[i_result] = results[i_result].res
        }
      }

      if (is_failure) {
        reject(results[i_result].err)
      } else {
        resolve(results)
      }
    })
  })
}

var movePromiser = function (from, to, records) {
  return fs.move(from, to).then(function () {
    records.push({ from: from, to: to })
  })
}

var moveDir = function (from_dir, to_dir) {
  return fs.readdir(from_dir).then(function (children) {
    return fs
      .ensureDir(to_dir)
      .then(function () {
        var move_promises = []
        var moved_records = []
        var child
        for (var i_child = 0; i_child < children.length; i_child++) {
          child = children[i_child]
          move_promises.push(movePromiser(join(from_dir, child), join(to_dir, child), moved_records))
        }

        return promiseAllWait(move_promises).catch(function (err) {
          var undo_move_promises = []
          for (var i_moved_record = 0; i_moved_record < moved_records.length; i_moved_record++) {
            undo_move_promises.push(fs.move(moved_records[i_moved_record].to, moved_records[i_moved_record].from))
          }

          return promiseAllWait(undo_move_promises).then(function () {
            throw err
          })
        })
      })
      .then(function() {
        // Remove original output folder
        return rimraf(join(cwd, '../../.build/', pkgJSON.name.replace(/^@vibrant\//, 'vibrant-')), function(err) {
          if (err) {
            console.error(err)
          }
        })
      })
  })
}

// Move compiled files to lib folder
moveDir(join(cwd, '../../.build/packages', pkgJSON.name.replace(/^@vibrant\//, 'vibrant-'), 'src'), join(cwd, 'lib'))