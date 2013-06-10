var util = require("util");
var structure = require(__dirname + "/structure.js").structure;

///////////
// QUEUE //
///////////

/*
Assuming a list called "key":

- key (the main document, holds metadata & timestamps)
- key:_counter (counter for this document; used as the array index and length)
- key:_readCounter (counter for reading)
- key:0 element at position 0
- key:n element at position n
*/

var queue = function(key, bucket){
  structure.call(this, key, bucket, "queue");
}

util.inherits(queue, structure);

queue.prototype._configure = function(callback){
  var self = this;
  self.addChild("_readCounter", 0, function(err){
    callback(err);
  });
}

queue.prototype.length = function(callback){
  var self = this;
  self.load(function(err){
    if(err != null){
      callback(err);
    }else{
      self.getCount(function(err, count){
        if(err != null){
          callback(err)
        }else{
          self.getChild("_readCounter", function(err, readCount){
            var length = count - readCount;
            callback(err, length);
          });
        }
      });
    }
  });
}

queue.prototype.pop = function(callback){
  var self = this;
  var readCounterKey = self.key + self.keySeperator() + "_readCounter";
  self.childExists("_readCounter", function(err, found){
    if(!found){
      callback(err, null);
    }else{
      self.bucket.incr(readCounterKey, function(err, readCount){
        if(err != null){
          callback(err);
        }else{
          self.getChild(readCount, function(err, data){
            if(err != null && String(err) === "Error: child does not exist" ){
              // none left to pop
              self.bucket.incr(readCounterKey, {offset: -1}, function(err, readCount){
                callback(err, null); 
              });
            }else if(err != null){
              callback(err);
            }else{
              self.removeChild(readCount, function(err){
                callback(err, data)
              });
            }
          });
        }
      });
    }
  });
}

queue.prototype.push = function(data, callback){
  var self = this;
  self.incr(function(err, count){
    if(err != null){
      callback(err);
    }else{
      self.addChild(count, data, function(err){
        if(typeof callback === "function"){ callback(err); }
      });
    }
  });
}

queue.prototype.getAll = function(callback){
  var self = this;
  self.load(function(err){
    if(err){
      callback(err);
    }else{
      self.getCount(function(err, count){
        if(err != null){
          callback(err)
        }else if(count === 0){
          callback(null, []);
        }else{
          self.getChild("_readCounter", function(err, readCount){
            if(err != null){
              callback(err)
            }else{
              var readCount = parseInt(readCount);
              var length = count - readCount;
              var i = readCount + 1;
              var completed = 0;
              var data = [];
              while(i <= count){
                (function(i){
                  self.getChild(i, function(err, doc){
                    data[i - readCount - 1] = doc;
                    completed++;
                    if(completed === length){
                      callback(err, data);
                    }
                  });
                })(i)
                i++;
              }
            }
          });
        }
      });
    }
  });
}

//

exports.queue = queue;