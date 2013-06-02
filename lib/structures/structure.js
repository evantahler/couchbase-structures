////////////////////
// Base Structure //
////////////////////

/*
Documents and Metata
Assuming a key called "key":

- key (the main document, holds metadata & timestamps)
- key:_counter (counter for this document)
*/

var structure = function(key, bucket, type){
  var self = this;
  if(key == null){ throw new Error("key is required"); }
  self.key = key;
  if(key == null){ throw new Error("bucket is required"); }
  self.bucket = bucket;  // couchbase bucket object
  if(type == null){ type = "structure" }
  self.type = type;
  self.metadata = self.generateDefaultState();
}

structure.prototype.counterPrefix = function(){
  return "_counter";
}

structure.prototype.keySeperator = function(){
  return ":";
}

structure.prototype.create = function(callback, ignoreDuplicateCreate){
  if(ignoreDuplicateCreate == null){ ignoreDuplicateCreate = false; }
  var self = this;
  self.exists(function(err, existing){
    if(err){
      if(typeof callback === "function"){ callback(err); }
    }else if(existing === true){
      if(ignoreDuplicateCreate === true){
        if(typeof callback === "function"){ callback(null); }
      }else{
        if(typeof callback === "function"){ callback(new Error("document already exists: " + self.key)); }
      }
    }else{
      self.save(function(err){
        if(err){
          if(typeof callback === "function"){ callback(err); }
        }else{
          self.bucket.set(self.key + self.keySeperator() + self.counterPrefix(), 0, function(err){
            if(err){
              if(typeof callback === "function"){ callback(err); }
            }else{
              if(typeof self._configure == "function"){
                self._configure(function(err){
                  if(typeof callback === "function"){ callback(err); }
                });
              }else{
                if(typeof callback === "function"){ callback(null); }
              }
            }
          });
        }
      });
    }
  });
}

structure.prototype.save = function(callback){
  var self = this;
  self.bucket.set(self.key, self.metadata, function(err, meta){
    if(err != null){
      if(typeof callback === "function"){ callback(err); }
    }else{
      if(typeof callback === "function"){ callback(null); }
    }
  });
}

structure.prototype.generateDefaultState = function(){
  var self = this;
  return {
    createdAt: new Date().getTime(), 
    updatedAt: new Date().getTime(),
    type: this.type,
    childKeys: [
      self.counterPrefix(),
    ],
  }
};

structure.prototype.touch = function(callback){
  var self = this;
  self.metadata.updatedAt = new Date().getTime();
  self.save(callback);
}

structure.prototype.load = function(callback){
  var self = this;
  self.bucket.get(self.key, function(err, doc, meta){
    if(err != null){
      callback(err, null);
    }else{
      self.metadata = doc;
      callback(null, doc);
    }
  });
}

structure.prototype.getCount = function(callback){
  var self = this;
  var counterKey = self.key + self.keySeperator() + self.counterPrefix();
  self.bucket.get(counterKey, function(err, value, meta){
    if(err != null){
      callback(err, null);
    }else{
      callback(null, parseInt(value));
    }
  });
}

structure.prototype.incr = function(offset, callback){
  var self = this;
  if(typeof offset == "function"){ callback = offset; offset = null; }
  if(offset == null){ offset = 1; }
  var counterKey = self.key + self.keySeperator() + self.counterPrefix();
  self.bucket.incr(counterKey, {offset: parseInt(offset)}, function(err, value, meta){
    if(err != null){
      callback(err, null);
    }else{
      self.touch(function(){
        if(typeof callback === "function"){ callback(null, parseInt(value)); }
      });
    }
  });
}

structure.prototype.forceCounter = function(value, callback){
  var self = this;
  value = parseInt(value)
  var counterKey = self.key + self.keySeperator() + self.counterPrefix();
  self.bucket.set(counterKey, value, function(err, meta){
    self.bucket.get(counterKey, function(err, value, meta){
      if(err != null){
        if(typeof callback === "function"){ callback(err, null); }
      }else{
        self.touch(function(){
          if(typeof callback === "function"){ callback(null, parseInt(value)); }
        });
      }
    });
  });
}

structure.prototype.exists = function(callback){
  var self = this;
  self.bucket.get(self.key, function(err, doc, meta){
    if(err != null && String(err) != "Error: No such key"){
      callback(err, null);
    }else if(doc != null){
      callback(null, true);
    }else{
      callback(null, false);
    }
  });
}

structure.prototype.addChild = function(suffix, data, callback, overwrite){
  var self = this;
  suffix = String(suffix);
  if(typeof data === 'function'){ callback = data; data = null; }
  if(data == null){ data = {}; }
  var childKey = self.key + self.keySeperator() + suffix;
  self.childExists(suffix, function(err, exists){
    if(err != null){
      if(typeof callback === "function"){ callback(err); }
    }else if(exists === true && overwrite !== true){
      if(typeof callback === "function"){ callback(new Error("child already exists")); }
    }else{
      self.bucket.set(childKey, data, function(err){
        if(err != null){
          if(typeof callback === "function"){ callback(err); }
        }else{
          if(exists === false){
            self.metadata.childKeys.push(suffix);
          }
          self.touch(function(err){
            if(typeof callback === "function"){ callback(err); }
          });
        }
      });
    }
  });
}

structure.prototype.removeChild = function(suffix, callback){
  var self = this;
  var childKey = self.key + self.keySeperator() + suffix;
  self.childExists(suffix, function(err, exists){
    if(err != null){
      callback(err);
    }else if(exists === false){
      callback(new Error("child does not exist"));
    }else{
      self.bucket.remove(childKey, function(err){
        if(err != null){
          callback(err)
        }else{
          self.metadata.childKeys.splice(self.metadata.childKeys.indexOf(suffix), 1);
          self.touch(function(err){
            callback(err);
          });
        }
      });
    }
  });
}

structure.prototype.getChild = function(suffix, callback){
  var self = this;
  var childKey = self.key + self.keySeperator() + suffix;
  self.childExists(suffix, function(err, exists){
    if(err != null){
      callback(err);
    }else if(exists === false){
      callback(new Error("child does not exist"));
    }else{
      self.bucket.get(childKey, function(err, doc, metadata){
        if(err != null){
          callback(err);
        }else{
          callback(null, doc);
        }
      });
    }
  });
}

structure.prototype.childExists = function(suffix, callback){
  var self = this;
  var childKey = self.key + self.keySeperator() + suffix;
  self.bucket.get(childKey, function(err, doc, meta){
    if(err != null && String(err) != "Error: No such key"){
      callback(err, null);
    }else if(doc != null){
      callback(null, true);
    }else{
      callback(null, false);
    }
  });
}

structure.prototype.destroy = function(callback){
  var self = this;
  self.load(function(err){
    if(err != null){
      callback(err);
    }else if(self.metadata.childKeys.length === 0){
      self.bucket.remove(self.key, function(err){
        callback(err);
      });
    }else{
      var count = 0;
      self.metadata.childKeys.forEach(function(suffix){
        count++;
        var childKey = self.key + self.keySeperator() + suffix;
        self.bucket.remove(childKey, function(err){
          count--;
          if(count === 0){
            self.bucket.remove(self.key, function(err){
              callback(err);
            });
          }
        });
      });
    }
  });
}

//

exports.structure = structure;