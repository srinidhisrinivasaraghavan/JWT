var Hapi = require('hapi');
var mongoose    = require('mongoose');
var jwt    = require('jsonwebtoken');
var config = require('./config'); // get our config file
var User   = require('./app/models/user'); // get our mongoose model
 
mongoose.connect(config.database);

//takes the token (decoded => decoded token => this has the user details. used to check the validity of the token)
var validate = function (decoded, request, callback) {
    User.findOne({name: decoded._doc.name}, function(err, user) {
      if(err){
        return callback(null, false);
      }
      if(!user){
        return callback(null, false);
      }
      return callback(null, true);
    });
};
 
// bring your own validation function 
var server = new Hapi.Server();
server.connection({ port: 8000 });
        // include our module here ↓↓ 
server.register(require('hapi-auth-jwt2'), function (err) {
    if(err){
      console.log(err);
    }
    server.auth.strategy('jwt', 'jwt',{
      key: 'YourSuperLongKeyHere',
      validateFunc: validate,           // Never Share your secret key 
      verifyOptions: { algorithms: [ 'HS256' ] } // pick a strong algorithm 
    });
    server.auth.default('jwt');
    server.route([
      {
        method: "GET", 
        path: "/", 
        config: { auth: false },
        handler: function(request, reply) {
          reply({text: 'Hello from token not required'});
        }
      },
      {
        method: "GET", 
        path: "/setup", 
        config: { auth: false },
        handler: function(request, reply) {
          //create a sample user
          var nick = new User({ 
            name: 'srinidhi', 
            password: 'password',
            admin: true 
          });

          //save the sample user
          nick.save(function(err) {
            if (err) throw err;
            console.log('User saved successfully');
            reply({ success: true });
          });
        }
      },
      {
        method: "GET", 
        path: "/users",
        config: { auth: 'jwt' },
        handler: function(request, reply) {
          User.find({}, function(err, users) {
            if(err){
              throw err;
            }
            reply(users);
          });
        }
      },
      {
        method: "POST", 
        path: "/authenticate", 
        config: { auth: false },
        handler: function(request, reply) {
          // find the user
          User.findOne({name: request.payload.name}, function(err, user) {
            if (err) throw err;
            if (!user) {
              reply({ success: false, message: 'Authentication failed. User not found.' });
            } 
            else if (user) {
              // check if password matches
              if (user.password != request.payload.password) {
                reply({ success: false, message: 'Authentication failed. Wrong password.' });
              } 
              else {
                // if user is found and password is right
                // create a token
                var token = jwt.sign(user, 'YourSuperLongKeyHere', {
                  expiresIn : 1440 // expires in 24 hours
                });
                // return the information including token as JSON
                reply({
                  success: true,
                  message: 'Enjoy your token!',
                  token: token
                });
              }
            }   
          });
        }
      },
      {
        method: 'GET',
        path: '/restricted',
        config: { auth: 'jwt' },
        handler: function(request, reply) {
          console.log('handler');
          reply({text: 'You used a Token!'})
          .header("Authorization", request.headers.authorization);
        }
      }
    ]);
});
 
server.start(function () {
  console.log('Server running at:', server.info.uri);
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
