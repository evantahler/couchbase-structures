# Couchbase Structures
*compound data structures for couchbase built in node.js*

[![Build Status](https://travis-ci.org/evantahler/couchbase-structures.png?branch=master)](https://travis-ci.org/evantahler/couchbase-structures)

This project creates helpful wrappers around normal couchbase documents to allow you to create more complex objects.  Being couchbase, this means that your objects will be redundant and distributed!

Note that this code it likley to be very buggy and slow.  You were warned!

- **[GitHub](https://github.com/evantahler/couchbase-structures)**
- **[NPM](https://npmjs.org/package/couchbase-structures)**

## Install

`npm install couchbase-structures`

## Example
```javascript
var couchbase = require("couchbase"); 
var CouchbaseStructures = require("couchbase-structures");

var couchbase_config = {
  debug    : false,
  hosts    : [ "localhost:8091" ],
  password : "password",
  bucket   : "demo",
  user     : "demo"
}

couchbase.connect(couchbase_config, function(err, bucket){
  if(err){ 
    console.log(err);
    process.exit();
  }else{

    // arrays
    var arr = new CouchbaseStructures.array("myArray", bucket);
    arr.create(function(err){
      arr.set(0, {'name': 'array thing 1'}, function(err){
        arr.set(5, {'name': 'array thing 5'}, function(err){
          arr.length(function(err, length){
            console.log(length) // 6
            arr.get(5, function(err, doc){
              console.log(doc); // doc = {'name': 'array thing 5'}
            });
            arr.get(3, function(err, doc){
              console.log(doc); // doc = null
            });
          });
        });
      });
    });

    // queues
    var queue = new CouchbaseStructures.queue("myQueue", bucket);
    queue.create(function(err){
      queue.push({'name': 'queue thing #1'}, function(err){
        queue.push({'name': 'queue thing #2'}, function(err){
          queue.length(function(err, length){
            console.log(length) // 2
            queue.pop(function(err, doc){
              console.log(doc); // doc = {'name': 'queue thing #1'}
            });
            queue.pop(function(err, doc){
              console.log(doc); // doc = {'name': 'queue thing #2'}
            });
          });
        });
      });
    });

    // hash
    var hash = new CouchbaseStructures.hash("myHash", bucket);
    hash.create(function(err){
      hash.set('key_1', {'name': 'hash thing #1'}, function(err){
        hash.set('key_3', {'name': 'hash thing #3'}, function(err){ 
          hash.length(function(err, length){
            console.log(length) // 2
            hash.get('key_3', function(err, doc){
              console.log(doc) // {'name': 'hash thing #3'}
            });
            hash.get('some_other_key', function(err, doc){
              console.log(doc) // null
            }); 
          });
        });
      });
    });

  }
});
```

You can run these tests from `demo.js`, which is included in this project.

## Config

The only configuration options are key seperators and timeout options.  You can overide the defaults like so:

```javascript
var CouchbaseStructures = require("couchbase-structures");
CouchbaseStructures.structure.prototype.counterPrefix = function(){ return "_counter"; }
CouchbaseStructures.structure.prototype.createPlaceholder = function(){ return "PLACEHOLDER"; }
CouchbaseStructures.structure.prototype.keySeperator = function(){ return ":"; }
CouchbaseStructures.structure.prototype.lockDuration = function(){ return 10; } // seconds
CouchbaseStructures.structure.prototype.lockAttempts = function(){ return 10; }
CouchbaseStructures.structure.prototype.lockWaitSleep = function(){ return 100; } // miliseconds
```

## DSL

### Structure
All of the types defined in this project inherit from `structure`.  This class holds the primitives for getting and setting child documents, updating metadata, etc.  The public methods are listed here:

#### object = new structure('name', bucket)

* bucket is a couchbase `bucket` object returned from esablishing a connection
* the name should be unique

#### object.create(callback(err))

* used to create a new object.  Will fail if the document already exists

#### object.load(callback(err, metadata))

* used to load in a previously created object

#### object.destroy(callback(err))

* used to delete an object and all children

### Array

#### array.set(index, data, callback(err))

* set a key in an array
* an id can be set (0 -> infinity).  This will increase the size of the array if needed

#### array.get(index, callback(err, data))

* return an element of an array
* possible to get an `out of bounds` error

#### array.length(callback(err, length))

* get the size of the array (including `null` values)

#### array.getAll(callback(err, data))

* get every item in the array
* this is likely to be very slow

### Queue (list)

#### queue.push(index, data, callback(err))

* push a document to the end of the queue

#### queue.pop(index, callback(err, data))

* return and remove the first element from a queue
* possible to `null` if the queue is empty

#### queue.length(callback(err, length))

* get the size of the queue

#### queue.getAll(callback(err, data))

* get every item in the queue
* this is likely to be very slow

### Hash
Note that these hashes differ from normal couchbase documents in that they will allow you to update one key of the hash indepentandly from the the entirety of the document.

#### hash.set(key, data, callback(err))

* set a key in an hash

#### hash.get(key, callback(err, data))

* return an element of a hash
* null will be returned if the key is not set

#### hash.length(callback(err, length))

* get the count of the set keys in a hash

#### hash.getAll(callback(err, data))

* get every item in the hash
* this is likely to be very slow

## Testing

`npm test` should be all you need.  Be sure that your couchbase settings match what is defined in the test:
```javascript
var couchbase_config = {
  "debug" : false,
  "hosts" : [ "localhost:8091" ],
  "password" : "password",
  "bucket" : "test",
  "user" : "test"
}
```
