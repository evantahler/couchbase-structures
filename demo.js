var couchbase = require("couchbase"); 
var CouchbaseStructures = require("./index.js");

var couchbase_config = {
  debug    : false,
  hosts    : [ "localhost:8091" ],
  password : "password",
  bucket   : "test",
  user     : "test"
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