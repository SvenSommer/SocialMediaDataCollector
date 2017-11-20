var express             = require("express"),
    app                 = express(),
    methodOverride      = require("method-override"),
    bodyParser          = require("body-parser"),
    mongoose            = require("mongoose"),
    moment              = require('moment');
    
// killall mongod ; cd ; ./mongod --repair ; cd data ; rm -rf mongod.lock ; cd ; ./mongod

app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));




 var indexRoutes         = require("./routes/index"),
     subredditRoutes     = require("./routes/subreddits");
    

//APP Config
app.locals.moment = moment;
var url = process.env.DATABASEURL || "mongodb://localhost/subredditdata";
mongoose.connect(url, {useMongoClient: true});
  
 app.use("/", indexRoutes);  
 app.use("/subreddits", subredditRoutes);  
    
app.listen(process.env.PORT, process.env.IP, function(){
    console.log("Server has started!");
});