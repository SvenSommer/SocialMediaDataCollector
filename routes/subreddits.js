var express     = require("express");
var router      = express.Router();
var Subreddit   = require("../models/subreddit");
var Crawler     = require("crawler");
var moment      = require('moment');
const path      = require('path');
var fs          = require('fs');



//INDEX - show all subreddits
router.get("/", function(req,res){
    Subreddit.find().exec(function(err, subreddits){
        if(err){
            console.log(err);
        }
    res.render("subreddits/index", {subreddits: subreddits});
    });
});

//CREATE - add new subreddit to DB
router.post("/", function(req,res){
    
    Subreddit.create(req.body.subreddit, function(err, newSubreddit){
        if(err){
            console.log(err);
        } else
        {
            var newurl = newSubreddit.url.replace("reddit.com/","redditmetrics.com/");
            c.queue({
                uri:newurl,
                subreddit:newSubreddit,
            });

            newSubreddit.save();
            res.redirect("/subreddits");
        }
    });
    
});

//NEW - show form to create Event
router.get("/new", function(req, res) {
   res.render("subreddits/new"); 
});

//REFRESH - edit an existing Event
router.get("/:id/refresh", function(req, res) {
    Subreddit.findById(req.params.id, function(err, foundSubreddit){
          if(err){
            console.log(err);
        } else {
            var newurl = foundSubreddit.url.replace("reddit.com/","redditmetrics.com/");
            
            c.queue({
                uri:newurl,
                subreddit:foundSubreddit,
            });

            foundSubreddit.save();
            res.redirect("/subreddits");
        }
    });
});

//DOWNLOAD - Download data
router.get("/:id/download", function(req, res) {
    Subreddit.findById(req.params.id, function(err, foundSubreddit){
          if(err){
            console.log(err);
        } else {
            var filetext = "Date, TotalSubscribers\r\n";
            foundSubreddit.totalSubscribers.forEach(function(tSubscriber){
              filetext += moment(tSubscriber.date).format('DD.MM.YYYY') + ", " + tSubscriber.subscribers + "\r\n";
            });
            var filecontent = filetext;
            var file = foundSubreddit.title.replace("/r/","").replace("(","").replace(")","").replace(" ","") +  "_redditData.csv";
            var filepath = path.resolve(".")+'/files/'+file;
            fs.writeFile(filepath, filecontent, function(err) {
                if(err) {
                    return console.log(err);
                }
                res.download(filepath); // magic of download fuction  
                console.log(filepath + " downloaded");
            }); 
            
            
          
            
        }
    });
});



var c = new Crawler({
    maxConnections : 10,
    // This will be called for each crawled page
    callback : function (error, res, done) {
        if(error){
            console.log(error);
        }else{
            var $ = res.$;
            // $ is Cheerio by default
            //a lean implementation of core jQuery designed specifically for the server
            console.log("Parsed: " + $("title").text());
            res.options.subreddit.title = $("title").text().replace(" metrics","");
            getSubscriberGrowth(res.options.subreddit,$("body").text());
            getTotalSubscribers(res.options.subreddit,$("body").text());
            getRank(res.options.subreddit,$("body").text());

        }
        done();
     
    }
});

function getSubscriberGrowth(subreddit,body) {
    var dataPattern = /element: 'subscriber-growth',[\r\n]\s+data: \[[\r\n](\s+{y:\s'\d{4}-\d{2}-\d{2}',\sa:\s-{0,1}\d{1,10}}(,){0,1}[\r\n])+/g;
    var dataPararaph = body.match(dataPattern);
    
    // console.log("Found Paragraph: |" + dataPararaph + "|");
    if(dataPararaph) {
        var datePattern = /{y:\s'\d{4}-\d{2}-\d{2}',\sa:\s\d{1,10}}/g;
        var subscriberGrowthFound = dataPararaph.toString().match(datePattern);
        subreddit.subscriberGrowth = [];
        subscriberGrowthFound.forEach(function(subscriberline){
          var newline =  subscriberline.replace('a','"subscribers"').replace('y','"date"').replace("'",'"').replace("'",'"');
           try {
                var obj = JSON.parse(newline);
                subreddit.subscriberGrowth.push(obj);
           } catch (e) {
                console.log("Failed to parse string: " + e);
            }
        });
        subreddit.save();
    } else {
        console.log("Regex failed for getSubscriberGrowth");
    }
}

function getTotalSubscribers(subreddit,body) {
    var dataPattern = /element: 'total-subscribers',[\r\n]\s+data: \[[\r\n](\s+{y:\s'\d{4}-\d{2}-\d{2}',\sa:\s-{0,1}\d{1,10}}(,){0,1}[\r\n])+/g;
    var dataPararaph = body.match(dataPattern);
    
    // console.log("Found Paragraph: |" + dataPararaph + "|");
    if(dataPararaph) {
        var datePattern = /{y:\s'\d{4}-\d{2}-\d{2}',\sa:\s\d{1,10}}/g;
        var totalSubscribersFound = dataPararaph.toString().match(datePattern);
        subreddit.totalSubscribers = [];
        totalSubscribersFound.forEach(function(subscriberline){
          var newline =  subscriberline.replace('a','"subscribers"').replace('y','"date"').replace("'",'"').replace("'",'"');
           try {
                var obj = JSON.parse(newline);
                subreddit.totalSubscribers.push(obj);
           } catch (e) {
                console.log("Failed to parse string: " + e);
            }
        });
        subreddit.save();
    } else {
        console.log("Regex failed for getTotalSubscribers");
    }
}

function getRank(subreddit,body) {
    var dataPattern = /var rankData = \[[\r\n](\s+{y:\s'\d{4}-\d{2}-\d{2}',\sa:\s-{0,1}\d{1,10}}(,){0,1}[\r\n])+/g;
    var dataPararaph = body.match(dataPattern);
    
    //console.log("Found Paragraph: |" + dataPararaph + "|");
    if(dataPararaph) {
        var datePattern = /{y:\s'\d{4}-\d{2}-\d{2}',\sa:\s\d{1,10}}/g;
        var RankFound = dataPararaph.toString().match(datePattern);
        subreddit.rank = [];
        RankFound.forEach(function(rankline){
          var newline =  rankline.replace('a','"rank"').replace('y','"date"').replace("'",'"').replace("'",'"');
           try {
                var obj = JSON.parse(newline);
                subreddit.rank.push(obj);
           } catch (e) {
                console.log("Failed to parse string: " + e);
            }
        });
        subreddit.save();
    } else {
        console.log("Regex failed for getRank");
    }
}

    
module.exports = router;