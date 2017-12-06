/*
 * @Author: 賴斯斯斯斯斯
 * @Date:   2017-12-03 15:22:26
 */
var audio = document.querySelector('audio');
var lyricArr = [];
var lyricDefaultTop = $('.lyric-content').css('top'); // scrollLyric()需要使用该变量

// audio对象绑定事件
audio.addEventListener('canplay', function() {
    // 加载完成后自动播放
    // pauseBtnFunc();
}, false);

audio.addEventListener('play', function() {
    // 播放状态
    posterAnimationCtrl('running');
}, false);

audio.addEventListener('pause', function() {
    // 暂停状态
    posterAnimationCtrl('paused');
}, false);

audio.addEventListener('timeupdate', function() {
    // 播放过程 更新时间和进度条 滚动歌词
    updateCurrentTime();
    ctrlTimeBar(this.currentTime / this.duration);
    if ($('#lyric').hasClass('show-lyric')) scrollLyric();
}, false);

audio.addEventListener('ended', function() {
    // 播放完毕自动切歌
    getMusic();
}, false);

// 转换方法函数
function secondToMin(time) {
    // 将秒数转换为分秒
    var min = Math.floor(time / 60);
    var sec = Math.floor(time % 60);
    if (min < 10) min = '0' + min;
    if (sec < 10) sec = '0' + sec;
    return min + ':' + sec;
}

function convertJOSNFormat(str) {
    // 将str转换JOSN格式
    try {
        $.parseJSON(str);
    } catch (e) {
        return false;
    }
    return $.parseJSON(str);
}

// 初始化函数 各种控制面板的事件绑定
function initPlayer() {
    getAlbum();
    audio.volume = .6; // 设置默认音量

    // header面板绑定事件
    $('#change-theme').on('click', function() {
        $(this).toggleClass('icon-moon icon-playerlight')
            .parents('.wrap').toggleClass('night');
    });

    // 音量面板绑定事件
    var $volumeBarWrap = $('.volume-bar-wrapper'),
        $volumeBar = $('.volume-bar');

    $('.volume').on({
        mouseenter: function() {
            $volumeBarWrap.addClass('show-bar');
            $volumeBar.css("width", $volumeBar.attr('data-volume'));
        },

        mouseleave: function() {
            $volumeBarWrap.removeClass('show-bar');
        },

        click: function(e) {
            changeVolumeBar(e, $volumeBarWrap, $volumeBar);
        }
    });

    // 时间进度条绑定事件
    $('.time-bar-wrapper').on('click', function(e) {
        var diffX = e.pageX - $(this).offset().left;
        ctrlTimeBar(diffX);
        audio.currentTime = (diffX / this.offsetWidth) * audio.duration;
    });

    // more面板绑定事件
    $('.more').on('click', function(e) {
        var target = e.target;
        switch (target.id) {
            case 'lyric':
                $(target).toggleClass('show-lyric');
                showLyric();
                break;
            case 'download':
                downloadSong();
                break;
            case 'add':
                console.log('加入歌单功能在demo里意义不大，所以就没写');
                break;
            case 'share':
                console.log('偷懒了 这个功能没写');
                break;
        }
    });

    // audio控制面板绑定事件
    $('.audio-ctrl').on('click', function(e) {
        var target = e.target;
        switch (target.id) {
            case 'like':
                likeBtnFunc();
                break;
            case 'change-album':
                getAlbum();
                break;
            case 'pause':
                pauseBtnFunc();
                break;
            case 'next':
                getMusic();
                break;
        }
    });
}

// Ajax获取歌单数据
function getAlbum() {
    $.ajax({
        url: 'https://jirenguapi.applinzi.com/fm/getChannels.php',
        dataType: 'json',
        Method: 'get',
        success: function(response) {
            var albums = response.channels;
            index = Math.floor(Math.random() * albums.length); // 随机获取歌单
            albumName = albums[index].name;
            albumId = albums[index].channel_id;
            $('.album').text(albumName).attr({
                'title': albumName,
                'data-id': albumId
            });
            getMusic();
        }
    });
}

// Ajax获取歌曲数据
function getMusic() {
    $.ajax({
        url: 'https://jirenguapi.applinzi.com/fm/getSong.php',
        dataType: 'json',
        Method: 'get',
        data: {
            'channel': $('.album').attr('data-id')
        },
        success: function(ret) {
            if (ret.song[0].url == null) {
                // 若获取的文件的数据为null 则再次获取一次
                getMusic();
                return;
            }
            var resource = ret.song[0],
                url = resource.url,
                sid = resource.sid,
                ssid = resource.ssid,
                singer = resource.artist,
                songName = resource.title,
                posterPic = resource.picture;

            // render歌曲信息
            $('audio').attr({
                'src': url,
                'sid': sid,
                'ssid': ssid
            });
            $('.singer').text(singer);
            $('.song-name').text(songName);
            $('#like').removeClass('like');
            $('.lyric-bg').css('backgroundImage', `url(${posterPic})`);
            $('.poster').removeClass('poster-circle-play').css('backgroundImage', `url(${posterPic})`);
            $('#pause').removeClass('icon-player-play').addClass('icon-player-stop');

            lyricArr = []; // 清空歌词数据
            if ($('#lyric').hasClass('show-lyric')) {
                // 判断当前显示歌词开关 是否需要获取歌词 
                getLyric();
            }
            audio.play();
        },
        error: function() {
            // 获取出错则再获取一次
            getMusic();
        }
    });

}

// Ajax获取歌词数据
function getLyric() {
    var sid = $('audio').attr('sid'),
        ssid = $('audio').attr('ssid'),
        $lyrWrap = $('.lyric-content ul'),
        $lyrContent = $('.lyric-content');

    $lyrContent.css('top', '') // 滚动歌词复位
    $lyrWrap.empty(); // 清空歌词内容

    $.post('https://jirenguapi.applinzi.com/fm/getLyric.php', {
            ssid: ssid,
            sid: sid
        })
        .done(function(lyr) {
            lyr = convertJOSNFormat(lyr);
            if (!!lyr) {
                var rows = lyr.lyric.split('\n'); // 将歌词数据转换成数组
                rows.splice(0, 1); // 此处删除歌词首行显示的来源信息 歌曲歌词资源api由饥人谷整理提供 
                var timeReg = /\[\d{2}:\d{2}.\d{2}\]/g; // 时间正则
                var result = [];
                if (rows.length != 0) {
                    for (var i in rows) { // 遍历临时歌词数组
                        var time = rows[i].match(timeReg); // 匹配时间正则 获取时间数组
                        if (!time) continue; // 如果没有时间 就跳过继续遍历
                        var value = rows[i].replace(timeReg, ""); // 获取歌词纯文本数据

                        for (var j in time) { // 遍历时间数组
                            var t = time[j].slice(1, -1).split(':'); // 分析时间数组 格式为[00:00.00] 分钟和秒分别为t[0],t[1]
                            var timeArr = parseInt(t[0], 10) * 60 + parseFloat(t[1]); // 将分钟转换成秒
                            result.push([timeArr, value]); // push时间和歌词 result[i][0]为当前时间 result[i][1]为歌词文本
                        }
                    }
                } else {
                    // 若歌词数组为空 添加提示
                    $lyrWrap.html(`<li>暂无歌词<li>`);
                    return;
                }

                result.sort(function(a, b) {
                    // 歌词按播放时间排序
                    return a[0] - b[0];
                });

                lyricArr = result;
                renderLyric();
            } else {
                // 若获取歌词数据格式error 添加提示
                $lyrWrap.html(`<li>抱歉 未找到歌词<li>`);
                return;
            }
        })
}

// audio控制函数 音量 播放进度 暂停 切换歌单 喜欢
function changeVolumeBar(e, $volumeBarWrap, $volumeBar) {
    // 音量调节
    var target = e.target;
    var diffX = '',
        width = $volumeBarWrap.outerWidth();

    if (target.id === 'mute') {
        diffX = (audio.volume !== 0) ? 0 : width * .6;
    } else if ($(target).hasClass('volume-bar-wrapper') || $(target).hasClass('volume-bar')) {
        diffX = e.pageX - $volumeBarWrap.offset().left;
    } else {
        return;
    }

    $volumeBar.attr('data-volume', (diffX / width) * 100 + '%');
    $volumeBar.css('width', diffX);
    audio.volume = diffX / width;
}

function updateCurrentTime() {
    // 更新播放时间
    var playTime = secondToMin(audio.currentTime),
        duration = audio.duration;

    $('.cur-time').html(playTime);
    $('.end-time').html((duration) ? '/ ' + secondToMin(duration) : '/ 00:00');
}

function ctrlTimeBar(diffX) {
    // 更新播放进度条
    var $timeBar = $('.time-bar'),
        $timeDot = $('.time-dot');

    diffX = (diffX > 1) ? diffX : diffX * $timeBar.parent().outerWidth();
    $timeBar.css('width', diffX);
    $timeDot.css('left', diffX);
}

function likeBtnFunc() {
    // 爱心按钮
    $('#like').toggleClass('like');
    // 可能还需要实现一些功能
}

function pauseBtnFunc() {
    // 暂停/播放按钮
    if (audio === null) return false;
    $('#pause').toggleClass('icon-player-play icon-player-stop');

    audio.paused ? audio.play() : audio.pause();
}

function posterAnimationCtrl(cmd) {
    // 海报旋转控制
    $('.poster').addClass('poster-circle-play').css('animationPlayState', cmd);
}

// more控制函数 歌词(显示歌词 渲染歌词 滚动歌词) 下载 (添加歌单 分享 两个功能没写 0.0)
function renderLyric() {
    // 渲染歌词
    var lyrLi = '';
    for (var i = 0; i < lyricArr.length; i++) {
        lyrLi += `<li data-time=${lyricArr[i][0]}>${lyricArr[i][1]}</li>`;
    }
    $('.lyric-content ul').html(lyrLi);
}

function showLyric() {
    // 显示歌词开关
    if (lyricArr.length == 0) getLyric();
    $('.poster').toggle();
    $('.lyric-bg, .lyric-content').toggle(); // 歌词有背景
    // $('.lyric-content').toggle();  // 歌词没有背景
}

function scrollLyric() {
    // 滚动歌词
    var $lis = $('.lyric-content li');
    var curT, nextT, currentTime, index;
    for (var i = 0; i < lyricArr.length; i++) {
        curT = $lis.eq(i).attr('data-time');
        nextT = $lis.eq(i + 1).attr('data-time');
        currentTime = audio.currentTime;
        if (curT < currentTime && curT < nextT) {
            $lis.removeClass('active');
            $lis.eq(i).addClass('active');
            if (i > 0) $('.lyric-content').css('top', parseInt(lyricDefaultTop) - $lis.eq(i - 1).position().top);
        }
    }
}

function downloadSong() {
    window.open($('audio').attr("src"))
}

$(document).ready(initPlayer());