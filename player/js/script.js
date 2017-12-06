/*
 * @Author: 賴斯斯斯斯斯
 * @Date:   2017-11-25 11:28:15
 */
var Public = {
    $: function(elem) {
        return document.querySelector(elem);
    },

    updateClass: function(oldClass, newClass) {
        var target = this.$('.' + oldClass);
        if (target) {
            var targetClassList = target.classList;
            if (targetClassList.contains(oldClass)) {
                targetClassList.remove(oldClass);
                targetClassList.add(newClass);
            }
        }
    },

    switchClass: function(targetClassList, newClass) {
        if (targetClassList.contains(newClass)) targetClassList.remove(newClass);
        else targetClassList.add(newClass);
    },

    secondToMin: function(time) {
        // 将秒数转换为分秒
        var min = Math.floor(time / 60);
        var sec = Math.floor(time % 60);
        if (min < 10) min = '0' + min;
        if (sec < 10) sec = '0' + sec;
        return min + ':' + sec;
    },

    fetchOffset: function(node) {
        // 计算容器在浏览器窗口位置
        if (!node) return false;
        var ofLeft = node.offsetLeft,
            ofTop = node.offsetTop;
        while (node.offsetParent) {
            node = node.offsetParent;
            ofLeft += node.offsetLeft;
            ofTop += node.offsetTop;
        };
        return {
            'left': ofLeft,
            'top': ofTop
        };
    }
}

function initPlayer(obj) {
    renderSongInfo(obj);
    audio.volume = .6; // 默认音量

    // header面板绑定事件
    var themeBtn = Public.$('#change-theme');

    themeBtn.addEventListener('click', function() {
        if (this.classList.contains('icon-moon')) Public.updateClass('icon-moon', 'icon-playerlight');
        else Public.updateClass('icon-playerlight', 'icon-moon');
        changeTheme();
    }, false);

    // 控制面板绑定事件
    var ctrlPanel = Public.$('.audio-ctrl');

    ctrlPanel.addEventListener('click', function(e) {
        var target = e.target;
        switch (target.id) {
            case 'like':
                likeBtnFunc(target);
                break;
            case 'delete':
                deleteBtnFunc();
                break;
            case 'pause':
                pauseBtnFunc(target);
                break;
            case 'next':
                nextBtnFunc();
                break;
        }
    }, false);

    // 音量面板绑定事件
    var volumePanel = Public.$('.volume');
    var volumeBarWrap, volumeBar;

    volumePanel.addEventListener('mouseenter', function() {
        volumeBarWrap = this.querySelector('.volume-bar-wrapper');
        volumeBar = this.querySelector('.volume-bar');

        Public.switchClass(volumeBarWrap.classList, 'show-bar');
        volumeBar.style.width = volumeBar.getAttribute('data-volume');
    }, false);

    volumePanel.addEventListener('mouseleave', function() {
        Public.switchClass(volumeBarWrap.classList, 'show-bar');
        volumeBar.style.width = volumeBar.getAttribute('data-volume');
    }, false);

    volumePanel.addEventListener('click', function(e) {
        changeVolumeBar(e, volumeBarWrap, volumeBar);
    }, false);

    // 时间进度条绑定事件
    var timePanel = Public.$('.time-bar-wrapper');

    timePanel.addEventListener('click', function(e) {
        var diffX = e.pageX - Public.fetchOffset(this).left;
        updateTimeBar(diffX);
        audio.currentTime = (diffX / this.offsetWidth) * audio.duration;
    }, false);
}

function renderSongInfo(obj) {
    // 渲染歌曲可变信息
    var songName = Public.$('.song-name');
    var singer   = Public.$('.singer');
    var poster   = Public.$('.poster');
    var likeBtn  = Public.$('#like');
    songName.innerHTML = obj.songName;
    singer.innerHTML   = obj.singer;
    poster.className   = 'poster';
    poster.style.backgroundImage = `url(${obj.posterSrc})`;
    audio.setAttribute('src', obj.songSrc);

    if (!obj.like) {
        likeBtn.dataset.like = 0;
        likeBtn.classList.remove('like');
    } else {
        likeBtn.dataset.like = 1;
        likeBtn.classList.add('like')
    }
}

function changeVolumeBar(e, volumeBarWrap, volumeBar) {
    // 音量调节
    var target = e.target;
    var diffX;

    if (target.id === 'mute') {
        diffX = (audio.volume !== 0) ? 0 : volumeBarWrap.offsetWidth * .6;
    } else if (target.classList.contains('volume-bar-wrapper') || target.classList.contains('volume-bar')) {
        diffX = e.pageX - Public.fetchOffset(volumeBarWrap).left;
    } else {
        return;
    }

    volumeBar.dataset.volume = (diffX / volumeBarWrap.offsetWidth) * 100 + '%';
    volumeBar.style.width = diffX + 'px';
    audio.volume = diffX / volumeBarWrap.offsetWidth;
}

function updateCurrentTime() {
    // 更新播放时间
    var curTime = Public.$('.cur-time');
    var endTime = Public.$('.end-time');

    var playTime = Public.secondToMin(audio.currentTime);
    var duration = audio.duration;

    curTime.innerHTML = playTime;
    endTime.innerHTML = (duration) ? ' / ' + Public.secondToMin(duration) : '/00:00';
}

function updateTimeBar(diffX) {
    // 更新播放进度条
    var timeBar = Public.$('.time-bar');
    var timeDot = Public.$('.time-dot');
    diffX = (diffX > 1) ? diffX : diffX * timeBar.offsetParent.offsetWidth;
    timeBar.style.width = diffX + 'px';
    timeDot.style.left  = diffX + 'px';
}


function likeBtnFunc(target) {
    // 爱心按钮
    Public.switchClass(target.classList, 'like');
    if (target.dataset.like === 1) {
        target.dataset.like = 0;
        nowSong.like = 0;
    } else if (target.dataset.like === 0) {
        target.dataset.like = 1;
        nowSong.like = 1;
    }
}

function deleteBtnFunc() {
    // 垃圾桶按钮
    if (Data.length === 1) {
        console.log("最后一首歌了，求你别删了");
        return;
    }
    Data.splice(count, 1);
    count = (count === Data.length) ? 0 : count;
    nowSong = Data[count];
    renderSongInfo(nowSong);
    playSong();
}

function pauseBtnFunc(target) {
    // 暂停/播放按钮
    if (audio === null) return false;
    audio.paused ? playSong() : pauseSong();
}

function nextBtnFunc() {
    // 下一曲按钮
    if (Data.length === 1) {
        console.log("就一首歌了，怎么点都没用的");
        return;
    }
    count = (count === Data.length - 1) ? 0 : count + 1;
    nowSong = Data[count]
    renderSongInfo(nowSong);
    playSong();
}

function playSong() {
    // play
    Public.updateClass('icon-player-play', 'icon-player-stop');
    audio.play();
}

function pauseSong() {
    // pause
    Public.updateClass('icon-player-stop', 'icon-player-play');
    audio.pause();
}

function posterAnimationCtrl(cmd) {
    // 海报旋转控制
    var poster = Public.$('.poster');
    poster.classList.add('poster-circle-play')
    poster.style.animationPlayState = cmd;
}

function changeTheme() {
    // 切换主题
    Public.switchClass(Public.$('.wrap').classList, 'night');
}


var Data    = songData;
var count   = 0;
var nowSong = Data[count];
var audio   = Public.$('audio');

audio.addEventListener('canplay', function() {
    // 加载完成后自动播放
    // playSong();
}, false);

audio.addEventListener('play', function() {
    // 播放状态
    posterAnimationCtrl('running');
    Public.updateClass('icon-player-play', 'icon-player-stop');
}, false);

audio.addEventListener('pause', function() {
    // 暂停状态
    posterAnimationCtrl('paused');
    Public.updateClass('icon-player-stop', 'icon-player-play');
}, false);

audio.addEventListener('timeupdate', function() {
    // 播放过程 更新时间和进度条
    updateCurrentTime();
    updateTimeBar(this.currentTime / this.duration);
}, false);

audio.addEventListener('ended', function() {
    // 播放完毕自动切歌
    nextBtnFunc();
}, false);


initPlayer(nowSong);