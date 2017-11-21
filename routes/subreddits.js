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
        } else {
            parseHTML(newSubreddit,res);
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
            parseHTML(foundSubreddit,res);
        }
    });
    
});

//DOWNLOAD - Download data
router.get("/:id/download", function(req, res) {
    Subreddit.findById(req.params.id, function(err, foundSubreddit){
          if(err){
            console.log(err);
        } else {
            
            var filecontent = buildFile(foundSubreddit);
            var file = foundSubreddit.title.replace("/r/","").replace("(","").replace(")","").replace(" ","") +  "_redditData.txt";
            var filepath = path.resolve(".")+'/files/'+file;
            fs.writeFile(filepath, filecontent, function(err) {
                if(err) {
                    return console.log(err);
                }
                res.download(filepath);
                console.log(filepath + " downloaded");
            }); 
        }
    });
});

function buildFile(subreddit){
    var startDate =  new Date(2017, 0, 1);
    var endDate =  new Date();
    var resultMatrix = [];

   
    
    for (var d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
        var row = { date: Date,
                totalSubscribers: String,
                subscriberGrowth:  String,
                rank: String };
                
        row.date = new Date(d);
        row.totalSubscribers = "-";
        row.subscriberGrowth = "-";
        row.rank = "-";
        
        subreddit.totalSubscribers.map(obj => {
            if (obj.date.getTime() === new Date(d).getTime()) {
                row.totalSubscribers = obj.value;
            }
        });
        subreddit.subscriberGrowth.map(obj => {
            if (obj.date.getTime() === new Date(d).getTime()) {
                row.subscriberGrowth = obj.value;
            }
        });
        subreddit.rank.map(obj => {
            if (obj.date.getTime() === new Date(d).getTime()) {
                row.rank = obj.value;
            }
        });
    
        
        resultMatrix.push(row);
    }
    var filetext = "Date, TotalSubscribers, SubscriberGrowth, Rank\r\n";
        resultMatrix.forEach(function(row){
            filetext += moment(row.date).format('DD.MM.YYYY') + ", " + row.totalSubscribers + ", " + row.subscriberGrowth + ", " + row.rank + "\r\n";
        });
    return filetext;
}

   




function parseHTML(subreddit,res){
    c.queue({
        uri:subreddit.url.replace("reddit.com/","redditmetrics.com/"),
        subreddit:subreddit,
        sres : res
    });

}

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
            res.options.sres.redirect('/subreddits');
        }
        done();
    }
});

function getSubscriberGrowth(subreddit,body) {
    var dataPararaph = body.match(/element: 'subscriber-growth',[\r\n]\s+data: \[[\r\n](\s+{y:\s'\d{4}-\d{2}-\d{2}',\sa:\s-{0,1}\d{1,10}}(,){0,1}[\r\n])+/g);
    if(dataPararaph) {
        subreddit.subscriberGrowth = [];
        dataPararaph.toString().match(/{y:\s'\d{4}-\d{2}-\d{2}',\sa:\s\d{1,10}}/g).forEach(function(subscriberline){
            try {
                var obj = JSON.parse(subscriberline.replace('a','"value"').replace('y','"date"').replace("'",'"').replace("'",'"'));
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
    var dataPararaph = body.match(/element: 'total-subscribers',[\r\n]\s+data: \[[\r\n](\s+{y:\s'\d{4}-\d{2}-\d{2}',\sa:\s-{0,1}\d{1,10}}(,){0,1}[\r\n])+/g);
    if(dataPararaph) {
        subreddit.totalSubscribers = [];
        dataPararaph.toString().match(/{y:\s'\d{4}-\d{2}-\d{2}',\sa:\s\d{1,10}}/g).forEach(function(subscriberline){
            try {
                var obj = JSON.parse(subscriberline.replace('a','"value"').replace('y','"date"').replace("'",'"').replace("'",'"'));
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
    var dataPararaph = body.match(/var rankData = \[[\r\n](\s+{y:\s'\d{4}-\d{2}-\d{2}',\sa:\s-{0,1}\d{1,10}}(,){0,1}[\r\n])+/g);
    if(dataPararaph) {
        subreddit.rank = [];
        dataPararaph.toString().match( /{y:\s'\d{4}-\d{2}-\d{2}',\sa:\s\d{1,10}}/g).forEach(function(rankline){
            try {
                var obj = JSON.parse(rankline.replace('a','"value"').replace('y','"date"').replace("'",'"').replace("'",'"'));
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