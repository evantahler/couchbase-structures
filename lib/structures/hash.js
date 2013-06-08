var util = require("util");
var structure = require(__dirname + "/structure.js").structure;

///////////
// Hash //
///////////

/*
Assuming a hash called "key":

- key (the main document, holds metadata & timestamps)
- key:_counter (unused)
- key:aaa element at key aaa
- key:nnn element at position nnn
*/

var hash = function(key, bucket){
  structure.call(this, key, bucket, "hash");
}

util.inherits(hash, structure);

hash.prototype.keys = function(callback){
  var self = this;
  self.load(function(err){
    if(err != null){
      callback(err);
    }else{
      var keys = [];
      self.metadata.childKeys.forEach(function(childKey){
        if(childKey !== self.counterPrefix()){
          keys.push(childKey);
        }
      });
      // keys.sort();
      callback(null, keys);
    }
  });
};

hash.prototype.length = function(callback){
  var self = this;
  self.keys(function(err, keys){
    var length;
    if(keys != null){ length = keys.length; }
    callback(err, length);
  });
}

hash.prototype.get = function(key, callback){
  var self = this;
  self.childExists(key, function(err, exists){
    if(err != null){
      callback(err);
    }else if(exists === false){
      callback(null, null);
    }else{
      self.getChild(key, function(err, data){
        callback(err, data, key);
      });
    }
  });
}

hash.prototype.set = function(key, data, callback){
  var self = this;
  self.childExists(key, function(err, exists){
    if(err != null){
      callback(err);
    }else if(exists === false){
      self.addChild(key, data, function(err){
        self.incr(1, function(err){
          if(typeof callback === "function"){ callback(err); }
        });
      }, true);
    }else{
      self.addChild(key, data, function(err){
        if(typeof callback === "function"){ callback(err); }
      }, true);
    }
  });
}

hash.prototype.unset = function(key, callback){
  var self = this;
  self.removeChild(key, function(err){
    if(err != null){
      callback(err); 
    }else{
      self.incr(-1, function(err){
        if(typeof callback === "function"){ callback(err); }
      });
    }
  });
}

hash.prototype.getAll = function(callback){
  var self = this;
  self.keys(function(err, keys){
    if(err != null){
      callback(err);
    }else{
      var count = 0;
      var data = {};
      if(keys.length === 0){
        callback(null, {});
      }else{
        keys.forEach(function(key){
          count++;
          data[key] = null;
          self.get(key, function(err, doc, key){
            if(key != null){
              data[key] = doc;
            }
            count--;
            if(count === 0){
              callback(null, data);
            }
          });
        });
      }
    }
  });
}

//

exports.hash = hash;