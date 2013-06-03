var should = require("should");
var couchbase = require("couchbase"); 
var bucket;

var CouchbaseStructures = require("./../index.js");

var couchbase_config = {
  "debug" : false,
  "hosts" : [ "localhost:8091" ],
  "password" : "password",
  "bucket" : "test",
  "user" : "test"
}

var connect = function(callback){
  couchbase.connect(couchbase_config, function(err, b){
    if(err){ 
      console.log(error);
      process.exit();
    }else{
      bucket = b;
      callback()
    }
  });
}

var cleanup = function(callback){
  var count = 0;
  [
    "foo", 
    "test", 
    "test2", 
    "test3", 
    "test:_counter", 
    "test2:_counter", 
    "test3:_counter", 
    "test:childish",
    "test:_readCounter",
    "test:item-0",
    "test:item-1",
    "test:item-2",
    "test:0",
    "test:1",
    "test:2",
    "test:3",
    "test:4",
  ].forEach(function(key){
    count++;
    bucket.remove(key, function(){
      count--;
      if(count === 0){ callback(); }
    });
  });
}

describe('couchbase', function(){  
  
  before(function(done){
    connect(function(){
      done();
    })
  });

  describe('basics', function(){  

    it("should be able to connect to couchbase", function(done){
      bucket.should.be.an.instanceOf(Object);
      bucket.set("foo", {key: "bar"}, function(err, metadata){
        bucket.get("foo", function(err, doc, metadata){
          doc.key.should.equal("bar");
          done();
        });
      });
    });

    after(function(done){
      cleanup(done);
    });

  });

  describe('structure prototype', function(){ 

    it("can make a basic object", function(done){
      var t = new Date().getTime();
      var obj = new CouchbaseStructures.structure("test", bucket);
      obj.type.should.equal("structure");
      obj.key.should.equal("test");
      obj.metadata.createdAt.should.be.within(t, t + 3);
      obj.metadata.updatedAt.should.be.within(t, t + 3);
      obj.metadata.childKeys[0].should.equal("_counter");
      done();
    });

    it("requires a key", function(done){
      try{
        var obj = new CouchbaseStructures.structure();
      }catch(e){
        String(e).should.equal("Error: key is required");
        done();
      }
    });

    it("will save correctly", function(done){
      var obj = new CouchbaseStructures.structure("test", bucket);
      obj.create(function(err){
        should.not.exist(err);
        done();
      });
    });

    it("can check if it exists", function(done){
      var obj = new CouchbaseStructures.structure("test", bucket);
      obj.exists(function(err, exists){
        exists.should.equal(true);
        done();
      });
    })

    it("will fail on create if another doc exists with the same name", function(done){
      var obj = new CouchbaseStructures.structure("test", bucket);
      obj.create(function(err){
        String(err).should.equal("Error: document already exists: test");
        done();
      });
    });

    it("will be able to retrive it's own metadata", function(done){
      var t = new Date().getTime();
      var obj = new CouchbaseStructures.structure("test2", bucket);
      obj.create(function(err){
        obj.load(function(err, metadata){
          metadata.type.should.equal("structure");
          metadata.createdAt.should.be.within(t, t + 3);
          metadata.updatedAt.should.be.within(t, t + 3);
          metadata.childKeys[0].should.equal("_counter");
          done();
        })
      });
    })

    it("will be able to get the count", function(done){
      var obj = new CouchbaseStructures.structure("test", bucket);
      obj.getCount(function(err, count){
        count.should.equal(0);
        done();
      });
    })

    it("will be able to incr the count", function(done){
      var obj = new CouchbaseStructures.structure("test", bucket);
      obj.getCount(function(err, count){
        count.should.equal(0);
        obj.incr(10, function(err, count){
          count.should.equal(10);
          obj.incr(-2, function(err, count){
            count.should.equal(8);
            done();
          });
        });
      });
    })

    it("will be able to force-set the count", function(done){
      var obj = new CouchbaseStructures.structure("test", bucket);
      obj.forceCounter(999, function(err, count){
        count.should.equal(999);
        done();
      });
    });

    it("will be able touch its timestamps", function(done){
      var obj = new CouchbaseStructures.structure("test", bucket);
      obj.load(function(){
        var a = obj.metadata.updatedAt;
        setTimeout(function(){
          obj.lockedUpdate(function(cb){
            obj.touch();
            cb();
          }, function(err){
            obj.metadata.updatedAt > a;
            done();
          });
        }, 10);
      });
    })

    it("will be able to add a child doc", function(done){
      var obj = new CouchbaseStructures.structure("test", bucket)
      obj.load(function(){
        obj.metadata.childKeys.length.should.equal(1);
        obj.addChild("childish", 'body', function(){
          obj.metadata.childKeys.length.should.equal(2);
          bucket.get("test:childish", function(err, doc, metadata){
            should.not.exist(err)
            doc.should.equal("body");
            done();
          });
        });
      });
    })

    it("will be able to remove a child doc", function(done){
      var obj = new CouchbaseStructures.structure("test", bucket)
      obj.load(function(){
        obj.metadata.childKeys.length.should.equal(2);
        obj.removeChild("childish", function(){
          obj.metadata.childKeys.length.should.equal(1);
          bucket.get("test:childish", function(err, doc, metadata){
            should.not.exist(doc);
            String(err).should.equal("Error: No such key");
            done();
          });
        });
      });
    })

    it("will be able to be removed", function(done){
      var obj = new CouchbaseStructures.structure("test3", bucket);
      obj.create(function(){
        obj.destroy(function(){
          bucket.get("test3", function(err, doc){
            should.not.exists(doc);
            bucket.get("test3:_counter", function(err, doc){
              should.not.exists(doc);
              done();
            });
          });
        });
      });
    });

  });

  describe("Array", function(){

    before(function(done){
      cleanup(done);
    });

    it("can createa an array", function(done){
      var t = new Date().getTime();
      var obj = new CouchbaseStructures.array("test", bucket);
      obj.type.should.equal("array");
      obj.key.should.equal("test");
      obj.metadata.createdAt.should.be.within(t, t + 3);
      obj.metadata.updatedAt.should.be.within(t, t + 3);
      obj.metadata.childKeys[0].should.equal("_counter");
      done();
    });

    it("starts with an initial length of 0", function(done){
      var obj = new CouchbaseStructures.array("test", bucket);
      obj.create(function(err){
        obj.length(function(err, length){
          length.should.equal(0);
          done();
        });
      });
    });

    it("setting an element will increase length", function(done){
      var obj = new CouchbaseStructures.array("test", bucket);
      obj.load(function(){
        obj.length(function(err, length){
          length.should.equal(0);
          obj.set(0, {body: 'item 0'}, function(err){
            should.not.exists(err);
            obj.length(function(err, length){
              length.should.equal(1);
              done();
            });
          });
        });
      });
    });

    it("can retrieve a set value", function(done){
      var obj = new CouchbaseStructures.array("test", bucket);
      obj.load(function(){
        obj.get(0, function(err, data){
          should.not.exists(err);
          data.body.should.equal('item 0');
          done();
        });
      });
    });

    it("will error when asking for a value which hasn't beeen set", function(done){
      var obj = new CouchbaseStructures.array("test", bucket);
      obj.load(function(){
        obj.get(2, function(err, data){
          should.not.exists(data);
          String(err).should.equal("Error: index out of bounds");
          done();
        });
      });
    });

    it("can set another value, skipping an index", function(done){
      var obj = new CouchbaseStructures.array("test", bucket);
      obj.load(function(){
        obj.set(2, {body: 'item 2'}, function(err){
          should.not.exists(err);
          obj.length(function(err, length){
            length.should.equal(3);
            done();
          });
        });
      });
    });

    it("can get all saved values", function(done){
      var obj = new CouchbaseStructures.array("test", bucket);
      obj.load(function(){
        obj.getAll(function(err, data){
          should.not.exists(err);
          data.length.should.equal(3);
          data[0].body.should.equal("item 0");
          should.not.exist(data[1]);
          data[2].body.should.equal("item 2");
          done();
        });
      });
    });

    it("will error if the index is not a valid integer", function(done){
      var obj = new CouchbaseStructures.array("test", bucket);
      obj.load(function(){
        obj.set(-1, {body: 'bad index'}, function(err){
          String(err).should.equal("Error: index must be a postitive integer");
          obj.set("words", {body: 'bad index'}, function(err){
            String(err).should.equal("Error: index must be a postitive integer");
            done();
          });
        });
      });
    });

    it("can be delted and will remove all children", function(done){
      var obj = new CouchbaseStructures.array("test", bucket);
      obj.destroy(function(err){
        should.not.exists(err);
        bucket.get("test:0", function(err, data){
          should.not.exists(data);
          bucket.get("test:1", function(err, data){
            should.not.exists(data);
            bucket.get("test:2", function(err, data){
              should.not.exists(data);
              done();
            });
          });
        });
      });
    });

  });

  describe("Queue", function(){

    before(function(done){
      cleanup(done);
    });

    it("can createa a list", function(done){
      var t = new Date().getTime();
      var obj = new CouchbaseStructures.queue("test", bucket);
      obj.type.should.equal("queue");
      obj.key.should.equal("test");
      obj.metadata.createdAt.should.be.within(t, t + 3);
      obj.metadata.updatedAt.should.be.within(t, t + 3);
      obj.metadata.childKeys[0].should.equal("_counter");
      done();
    });

    it("will have the readCounter generated on save", function(done){
      var obj = new CouchbaseStructures.queue("test", bucket);
      obj.create(function(err){
        should.not.exists(err);
        obj.metadata.childKeys.length.should.equal(2);
        obj.metadata.childKeys[0].should.equal("_counter");
        obj.metadata.childKeys[1].should.equal("_readCounter");
        obj.getChild("_readCounter", function(err, data){
          should.not.exists(err);
          parseInt(data).should.equal(0);
          done();
        });
      });
    });

    it("starts with an initial length of 0", function(done){
      var obj = new CouchbaseStructures.queue("test", bucket);
      obj.create(function(err){
        obj.length(function(err, length){
          length.should.equal(0);
          done();
        });
      });
    });

    it("pushing an element will increase lenght", function(done){
      var obj = new CouchbaseStructures.queue("test", bucket);
      obj.load(function(){
        obj.length(function(err, length){
          length.should.equal(0);
          obj.push({body: 'item 0'}, function(err){
            should.not.exists(err);
            obj.length(function(err, length){
              length.should.equal(1);
              done();
            });
          });
        });
      });
    });

    it("popping will return the value", function(done){
      var obj = new CouchbaseStructures.queue("test", bucket);
      obj.load(function(){
        obj.pop(function(err, data){
          should.not.exists(err);
          data.body.should.equal('item 0');
          done();
        });
      });
    });

    it("popping should have reduced the length", function(done){
      var obj = new CouchbaseStructures.queue("test", bucket);
      obj.length(function(err, length){
        should.not.exists(err);
        length.should.equal(0);
        done();
      });
    });

    it("can uniquly push many elements", function(done){
      var obj = new CouchbaseStructures.queue("test", bucket);
      obj.push({body: 'item 0'});
      obj.push({body: 'item 1'});
      obj.push({body: 'item 2'});
      setTimeout(function(){
        obj.length(function(err, length){
          should.not.exists(err);
          length.should.equal(3);
          done();
        });
      }, 300);
    });

    it("can get all it's children", function(done){
      var obj = new CouchbaseStructures.queue("test", bucket);
      obj.getAll(function(err, data){
        should.not.exists(err);
        data.length.should.equal(3);
        data[0].body.should.equal('item 0')
        data[1].body.should.equal('item 1')
        data[2].body.should.equal('item 2')
        done();
      });
    });

    it("can ensure that poping is a unique operation", function(done){
      var obj = new CouchbaseStructures.queue("test", bucket);
      obj.pop(function(err, data){
        should.not.exists(err);
        data.body.should.equal("item 0");
        obj.pop(function(err, data){
          should.not.exists(err);
          data.body.should.equal("item 1");
          obj.pop(function(err, data){
            should.not.exists(err);
            data.body.should.equal("item 2");
            obj.pop(function(err, data){
              should.not.exists(err);
              should.not.exists(data);
              done();
            });
          });
        });
      });
    });

    it("can be delted and will remove all children", function(done){
      var obj = new CouchbaseStructures.queue("test", bucket);
      obj.push({body: 'item n'}, function(err){
        should.not.exists(err);
        obj.destroy(function(err){
          should.not.exists(err);
          bucket.get("test:3", function(err, data){
            should.not.exists(data);
            bucket.get("test:4", function(err, data){
              should.not.exists(data);
              bucket.get("test:5", function(err, data){
                should.not.exists(data);
                done();
              });
            });
          });
        });
      });
    });

  });

  describe("Hash", function(){

    before(function(done){
      cleanup(done);
    });

    it("can createa a list", function(done){
      var t = new Date().getTime();
      var obj = new CouchbaseStructures.hash("test", bucket);
      obj.type.should.equal("hash");
      obj.key.should.equal("test");
      obj.metadata.createdAt.should.be.within(t, t + 3);
      obj.metadata.updatedAt.should.be.within(t, t + 3);
      obj.metadata.childKeys[0].should.equal("_counter");
      done();
    });

    it("starts with an initial length of 0", function(done){
      var obj = new CouchbaseStructures.hash("test", bucket);
      obj.create(function(err){
        obj.length(function(err, length){
          length.should.equal(0);
          done();
        });
      });
    });

    it("adding an element will increase lenght", function(done){
      var obj = new CouchbaseStructures.hash("test", bucket);
      obj.load(function(){
        obj.length(function(err, length){
          length.should.equal(0);
          obj.set("item-0", {body: 'item 0'}, function(err){
            should.not.exists(err);
            obj.length(function(err, length){
              length.should.equal(1);
              done();
            });
          });
        });
      });
    });

    it("can get it's hash keys", function(done){
      var obj = new CouchbaseStructures.hash("test", bucket);
      obj.keys(function(err, keys){
        should.not.exists(err);
        keys.length.should.equal(1);
        keys[0].should.equal("item-0");
        done();
      });
    });

    it("can read a set value", function(done){
      var obj = new CouchbaseStructures.hash("test", bucket);
      obj.get("item-0", function(err, data){
        should.not.exists(err);
        data.body.should.equal('item 0');
        done();
      });
    });

    it("will return null on an empty key", function(done){
      var obj = new CouchbaseStructures.hash("test", bucket);
      obj.get("xxxxxx", function(err, data){
        should.not.exists(err);
        should.not.exists(data);
        done();
      });
    })

    it("will allow for resetting (overwritting)", function(done){
      var obj = new CouchbaseStructures.hash("test", bucket);
      obj.load(function(){
        obj.set("item-0", {body: 'something else'}, function(err){
          should.not.exists(err);
          obj.get("item-0", function(err, data){
            should.not.exists(err);
            data.body.should.equal('something else');
            done();
          });
        });
      });
    });

    it("removing should reduce the length", function(done){
      var obj = new CouchbaseStructures.hash("test", bucket);
      obj.unset("item-0", function(){
        obj.length(function(err, length){
          should.not.exists(err);
          length.should.equal(0);
          done();
        });
      });
    });

    it("can get all keys and values", function(done){
      var obj = new CouchbaseStructures.hash("test", bucket);
      obj.set("item-0", {body: 'item 0'});
      obj.set("item-1", {body: 'item 1'});
      obj.set("item-2", {body: 'item 2'});
      setTimeout(function(){
        obj.getAll(function(err, data){
          should.not.exists(err);
          data['item-0'].body.should.equal("item 0")
          data['item-1'].body.should.equal("item 1")
          data['item-2'].body.should.equal("item 2")
          done();
        });
      }, 300);
    });

    it("can be delted and will remove all children", function(done){
      var obj = new CouchbaseStructures.hash("test", bucket);
      obj.destroy(function(err){
        should.not.exists(err);
        bucket.get("test:item-0", function(err, data){
          should.not.exists(data);
          bucket.get("test:item-1", function(err, data){
            should.not.exists(data);
            bucket.get("test:item-2", function(err, data){
              should.not.exists(data);
              done();
            });
          });
        });
      });
    });

  });

});