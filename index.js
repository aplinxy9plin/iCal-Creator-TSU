let ics = require('ics'),
    fs = require('fs'),
    cheerio = require('cheerio'),
    moment = require('moment'),
    ProgressBar = require('ascii-progress');
var total = 9;
var bar = new ProgressBar({
    schema: ':bar :percent',
    total : total
});
var a = {
  data: []
};
console.log('Downloading...');
function sendReq(week, callback) {
    'use strict';
    bar.tick();

    const httpTransport = require('http');
    const responseEncoding = 'utf8';
    const httpOptions = {
        // Хостнейм
        hostname: 'schedule.tsu.ru',
        port: '80',
        // Адрес расписания
        path: '/students_schedule?faculty_id=202&group_id=24023&week_num=' + week,
        method: 'GET',
        headers: {}
    };
    httpOptions.headers['User-Agent'] = 'node ' + process.version;
    const request = httpTransport.request(httpOptions, (res) => {
        let responseBufs = [];
        let responseStr = '';

        res.on('data', (chunk) => {
            if (Buffer.isBuffer(chunk)) {
                responseBufs.push(chunk);
            }
            else {
                responseStr = responseStr + chunk;
            }
        }).on('end', () => {
            responseStr = responseBufs.length > 0 ?
                Buffer.concat(responseBufs).toString(responseEncoding) : responseStr;
                const $ = cheerio.load(responseStr)
                var date = $('.schedule-info-week').text().split(' ')
                date = moment(date[2], "DD.MM.YYYY")
                var test_err = false;
                var empty_count = 0;
                try {
                  for (var u = 0; u < 6; u++) {
                    if(u !== 0){
                      var new_date = date.add(1, 'days')
                      var day = new_date.format('DD');
                      var month = new_date.format('MM');
                      var year = new_date.format('YYYY');
                    }else{
                      var day = date.format('DD');
                      var month = date.format('MM');
                      var year = date.format('YYYY');
                    }
                    for (var i = 1; i < 8; i++) {
                      try {
                        if($('.weekday_line')[u].children[i].children[0] == undefined || $('.weekday_line')[0].children[i].children[0].children[0] == undefined){
                          empty_count += 1;
                          if(empty_count == 42){
                            test_err = true
                          }
                        }else{
                          var hour = 0
                          var minutes = 0
                          switch (i) {
                            case 1:
                              hour = 8
                              minutes = 45
                              break;
                            case 2:
                              hour = 10
                              minutes = 35
                              break;
                            case 3:
                              hour = 12
                              minutes = 25
                              break;
                            case 4:
                              hour = 14
                              minutes = 45
                              break;
                            case 5:
                              hour = 16
                              minutes = 35
                              break;
                            case 6:
                              hour = 18
                              minutes = 25
                              break;
                            case 7:
                              hour = 20
                              minutes = 15
                              break;
                            default:
                          }
                          var type;
                          if ($('.weekday_line')[u].children[i].children[0].children[0].children[0].next.next.next.attribs.style.search('ff0000') != -1) {
                            type = 'Лекция'
                          }else if ($('.weekday_line')[u].children[i].children[0].children[0].children[0].next.next.next.attribs.style.search('296d90') != -1) {
                            type = 'Практика'
                          }else{
                            type = 'Лаборатории'
                          }
                          a.data.push({
                                 title: $('.weekday_line')[u].children[i].children[0].children[0].children[0].children[0].data,
                                 description: 'Тип: ' + type + '. Группа: ' + $('.weekday_line')[u].children[i].children[0].children[0].children[0].next.next.children[0].data + '. Аудитория: ' + $('.weekday_line')[u].children[i].children[0].children[0].children[0].next.children[0].data,
                                 location: $('.weekday_line')[u].children[i].children[0].children[0].children[0].next.children[0].data,
                                 duration: { minutes: 90 },
                                 start: [year, month, day, hour, minutes],
                          });
                        }
                      } catch (e) {
                        test_err = true
                        break;
                      }
                    }
                  }
                  if(test_err == true){
                    console.log(some_problem);
                  }
                  sendReq(week+1, callback)
                } catch (e) {
                  callback('success')
                }
        });

    })
    .setTimeout(0)
    .on('error', (error) => {
        callback(error);
    });
    request.write("")
    request.end();
}

sendReq(2, function(){
  for (var i = 0; i < total; i++) {
    bar.tick();
  }
  ics.createEvents(a.data, (error, value) => {
    if (error) {
      console.log(error)
    }
    fs.writeFileSync(`${__dirname}/finish.ics`, value)
  });
})
