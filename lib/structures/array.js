var util = require("util");
var structure = require(__dirname + "/structure.js").structure;

///////////
// Array //
///////////

/*
Assuming an array called "key":

- key (the main document, holds metadata & timestamps)
- key:_counter (counter for this document; used as the array index and length)
- key:0 element at position 0
- key:n element at position n
*/

var array = function(key, bucket){
  structure.call(this, key, bucket, "array");
}

util.inherits(array, structure);

array.prototype.length = function(callback){
  var self = this;
  self.getCount(function(err, count){
    callback(err, count);
  });
}

array.prototype.get = function(index, callback){
  var self = this;
  index = Math.abs(parseInt(index));
  self.length(function(err, length){
    if(err != null){
      callback(err);
    }else if(index > length){
      callback(new Error("index out of bounds"));
    }else{
      self.getChild(index, function(err, doc){
        callback(err, doc);
      });
    }
  });
}

array.prototype.set = function(index, data, callback){
  var self = this;
  index = Math.abs(parseInt(index));
  self.length(function(err, length){
    if(err != null){
      callback(err);
    }else{
      self.addChild(index, data, function(err){
        if(err != null){
          callback(err);
        }else{
          if(index >= length){
            self.forceCounter(index + 1, function(err){
              self.touch(function(err){
                if(typeof callback === "function"){ callback(err); }
              });
            });
          }else{
            self.touch(function(err){
              if(typeof callback === "function"){ callback(err); }
            });
          }
        }
      });
    }
  });
}

array.prototype.getAll = function(callback){
  var self = this;
  self.length(function(err, length){
    if(err != null){
      callback(err);
    }else if(length === 0){
      callback(null, []);
    }else{
      var i = 0;
      var response = [];
      var found = 0;
      while(i < length){
        (function(i){
          self.get(i, function(err, data){
            found++;
            response[i] = data;
            if(found === length){
              callback(null, response);
            }
          });
        })(i)
        i++;
      }
    }
  });
}

//

exports.array = array;