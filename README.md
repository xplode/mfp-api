# mfp-api
A node module for interfacing with the MyFitnessPal public api.

## Overview
MyFitnessPal does not have a documented public api and they are not keen on
giving out access to their private developer api.  This module interacts with
the mfp rails application.  Yes, it's very dirty.

On the plus side, you can get the general idea from this module of how to login
to mfp and interact with resources.

## Installation
```
npm install git://github.com/xplode/mfp-api.git
```

## Use
```
mfp = require('mfp-api');
var username = <your mfp username>; 
var password = <your mfp password>; 

// Setup the callback for calling the mfp api once we've logged in. 
var callback = function(err) {
  // In all the examples below I just log the fetched diary.
  var doStuff = function(err, diary) {
    if (err) {
      console.log(err);
     } else {
      console.log(JSON.stringify(diary));
    }
  };


  // Get food diary for today;
  mfp.getDiary('food', null, doStuff);

  // Get food diary for specific date;
  mfp.getDiary('food', '2017-05-24', doStuff); 

  // Get food exercise for today;
  mfp.getDiary('exercise', null, doStuff); 

  // Get food exercise for specific date;
  mfp.getDiary('exercise', '2017-05-24', doStuff); 
};

// Login to mfp and do stuff.
mfp.login(username, password, callback);
```
