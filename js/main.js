const addSkillDoc = document.querySelector('.add-skill');
const asideDoc = document.querySelector('main aside');
const sectionDoc = document.querySelector('main section');
const skillInfoDoc = document.querySelector('.skill-info')
const backDoc = document.querySelector('.return')
const rangeDoc = document.querySelectorAll('.skill-form input[type="range"]')
const durationDoc = document.querySelectorAll('.duration')
const contentDoc = document.querySelector('.content')
const contentDivDoc = document.querySelectorAll('.content div')
const logInfoDoc = document.querySelector('.log-info');
const maskBtDoc = document.querySelector('.mask');
const maskDivDocs = document.querySelectorAll('.mask div');

const formDoc = document.getElementById('skillForm')

//indexDB常量
const DB_NAME = 'skillManage';
const DB_VERSION = 4;
const DB_STORE_NAME = 'skill';
const DB_MODE = 'readwrite';
//全局
let db;
let dataMap = new Map();
let currentPanel;
var list = [];

formDoc.addEventListener('reset', () => {
    durationDoc[0].textContent = '600';
    durationDoc[1].textContent = '9';
})
formDoc.reset();
initalizeDB();
contentShow();
// 添加技能按钮
addSkillDoc.addEventListener('click', () => {
    let hiddenNode = formDoc.lastChild
    if (hiddenNode.type === 'hidden') {
        hiddenNode.parentNode.removeChild(hiddenNode);
    }
    formDoc.reset();
    contentShow('skill');
})
// 返回按钮
backDoc.addEventListener('click', () => {
    if (window.innerWidth < 450) {
        sectionDoc.style.display = 'flex';
        asideDoc.style.display = 'none';
    } else {
        asideDoc.style.display = 'none';
    }

})
// 菜单按钮
const menuBtDoc = document.querySelector('.menu');
menuBtDoc.addEventListener('click', () => {
    contentShow('menu');
})
// 保存按钮
formDoc.addEventListener('submit', (e) => {
    e.preventDefault()
    const formData = new FormData(formDoc)
    if (!formData.has('id')) {
        let id = getSkillId();
        formData.append('id', id)
    }
    updateDataToStore(Object.fromEntries(formData))
})
function initalizeDB() {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = (e) => {
        console.log('数据库打开');
        db = e.target.result;
        selectDataFromStore();
        selectSkillLogList();
        selectSkillLogToStatistics(1);
    }
    request.onerror = (e) => {
        alert("请允许我的 web 应用使用 IndexedDB！");
    }
    request.onupgradeneeded = (e) => {
        e.target.result.deleteObjectStore(DB_STORE_NAME)
        let skillDB = e.target.result.createObjectStore(DB_STORE_NAME, { keyPath: 'id' })
        e.target.result.deleteObjectStore('skillLog')
        let logStore = e.target.result.createObjectStore('skillLog', { keyPath: 'id', autoIncrement: true })
        logStore.createIndex('dateTime', 'dateTime', { unique: true });
        skillDB.createIndex('dateTime', 'dateTime', { unique: true });
        console.log('数据库构建');
    }
}
function createStore(mode, storeName) {
    return mode ? db.transaction(storeName, mode).objectStore(storeName) :
        db.transaction(storeName).objectStore(storeName);
}

function selectDataFromStore() {
    let store = createStore('readonly', DB_STORE_NAME);
    const index = store.index('dateTime');
    index.openCursor().onsuccess = (e) => {
        const cursor = e.target.result
        if (cursor) {
            dataToElement(e.target.result.value)
            cursor.continue();
        }
    }
    console.log('数据加载请求成功');
}
function updateDataToStore(data) {
    let store = createStore(DB_MODE, DB_STORE_NAME)
    data.dateTime = Date.now();
    data.todayNeedTime = data.todayTime - (data.todayAddUp || 0);
    data.sumNeedTime = data.skillTime - (data.addUp || 0);
    store.put(data).onsuccess = (e) => {
        console.log('数据更新成功', e.target.result);
        updatePanel(data);
    };
}
function selectSkillLogToStatistics(offset) {
    list = [];
    const store = createStore('readonly', 'skillLog');
    const index = store.index('dateTime');
    const now = new Date();
    const lastMonth = new Date(now.getFullYear()
        , now.getMonth() - offset
        , now.getDate(), 0, 0, 0);
    let current;
    let offsetTem;
    let lastMax;

    let range;
    if (offset == 1) {
        current = now.getDate();
        offsetTem = 30;
        let num = current - offsetTem;
        lastMax = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
        for (let i = 0; i < offsetTem; i++) {
            if (num <= 0) {
                let lastDay = lastMax + num;
                list.push({
                    'label': `${now.getMonth() > 9 ? now.getMonth() : '0' + now.getMonth()}-${lastDay > 9 ? lastDay : '0' + lastDay}`
                    , 'month': now.getMonth() - 1, 'day': lastDay
                });
                num++;
            } else {
                list.push({
                    'label': `${now.getMonth() + 1 > 9 ? now.getMonth() + 1 : '0' + now.getMonth() + 1}-${num > 9 ? num : '0' + num}`
                    , 'month': now.getMonth(), 'day': num
                });
                num++;
            }
        }
    } else {
        offsetTem = 12;
        current = now.getMonth() + 1;
        let num = current - offsetTem;
        lastMax = new Date(now.getFullYear(), 0, 0).getMonth() + 1;
        for (let i = 0; i < offsetTem; i++) {
            if (num < 0) {
                let month = lastMax + num;
                list.push({
                    'label': `${now.getFullYear() > 9 ? now.getFullYear() - 1 : '0' + now.getFullYear()}-${month + 1 > 9 ? month + 1 : '0' + (month + 1)}`
                    , 'year': now.getFullYear() - 1, 'month': month
                });
                num++;
            } else {
                list.push({
                    'label': `${now.getFullYear() + 1 > 9 ? now.getFullYear() : '0' + now.getFullYear() + 1}-${num + 1 > 9 ? num + 1 : '0' + (num + 1)}`
                    , 'year': now.getFullYear(), 'month': num
                });
                num++;
            }
        }
        range = IDBKeyRange.bound(lastMonth.valueOf(), Date.now());
    }

    index.getAll(range).onsuccess = (e) => {
        for (let i = 0; i < list.length; i++) {
            let sum = 0;
            for (const item of e.target.result) {
                const year = new Date(item.startDateTime).getFullYear();
                const month = new Date(item.startDateTime).getMonth();
                const itemDay = new Date(item.startDateTime).getDate();
                if (year == list[i].year && month == list[i].month) {
                    sum += item.duration;
                }
                if (month == list[i].month && itemDay == list[i].day) {
                    sum += item.duration;
                }
            }
            list[i].data = Math.floor(sum / 60 / 60 / 40);
        }
        // 初次绘制
        initChart(offset == 1 ? 15 : 450);
    }
    console.log(list);
}
function selectSkillLogList() {
    const store = createStore('readonly', 'skillLog');
    const index = store.index('dateTime');
    const range = IDBKeyRange.upperBound(Date.now());
    index.getAll(range).onsuccess = (e) => {
        for (const item of e.target.result) {
            const p = document.createElement('p');
            let date = new Date(item.endDateTime - item.startDateTime);
            p.innerHTML = `[${getNowDate(item.startDateTime)}] 学习<strong>${item.skillName}</strong> <b>${date.getHours() <= 8 ? date.getMinutes() : date.getHours() + '小时' + date.getMinutes()}</b>分钟`;
            logInfoDoc.appendChild(p);
        }
    }
}

function updateDataToStore2(data) {
    let store = createStore(DB_MODE, 'skillLog');
    store.put(data).onsuccess = (e) => {
        console.log('log数据添加成功', e.target.result);
    };
}
function logPanel(data) {


}
function dataToElement(item) {
    dataMap.set(item.id, item);
    constructorPanel(item)
}


for (const range of rangeDoc) {
    range.addEventListener('input', () => {
        updateDuration(range)
    })
}
function updateDuration(range) {
    if (range.value >= 200) {
        durationDoc[0].textContent = range.value;
    } else {
        durationDoc[1].textContent = range.value;
    }
}

function updatePanel(data) {

    const div = document.getElementById(data.id) || document.createElement('div');

    fillPanel(div, data);
    sectionDoc.prepend(div);

}
// 动态面板
function constructorPanel(data) {
    const div = document.createElement('div');
    div.setAttribute('id', data.id)
    fillPanel(div, data);
    sectionDoc.prepend(div);
    // sectionDoc.appendChild(div);

    div.addEventListener('click', (e) => {
        if (e.target.type === 'button') {
            maskBtDoc.style.visibility = 'visible';
            maskBtDoc.focus();
            currentPanel = dataMap.get(e.currentTarget.id)
            currentPanel.h = currentPanel.h || 0;
            currentPanel.m = currentPanel.m || 0;
            currentPanel.s = currentPanel.s || 0;
            currentPanel.h2 = currentPanel.h2 || currentPanel.todayTime;
            currentPanel.m2 = currentPanel.m2 || 0;
            currentPanel.s2 = currentPanel.s2 || 0;
            currentPanel.timerMode = currentPanel.timerMode || 'R';
            currentPanel.sumNeedTime = currentPanel.sumNeedTime || currentPanel.skillTime;
            currentPanel.todayNeedTime = currentPanel.todayNeedTime || currentPanel.todayTime;
            currentPanel.addUp = currentPanel.addUp || 1;
            currentPanel.todayAddUp = currentPanel.todayAddUp || 1;
            onOffDoc.value = 'on';
            timeShows[0].textContent = `${currentPanel.h > 9 ? currentPanel.h : '0' + currentPanel.h}:${currentPanel.m > 9 ? currentPanel.m : '0' + currentPanel.m}:${currentPanel.s > 9 ? currentPanel.s : '0' + currentPanel.s}`;
            timeShows[1].textContent = `${currentPanel.h2 > 9 ? currentPanel.h2 : '0' + currentPanel.h2}:${currentPanel.m2 > 9 ? currentPanel.m2 : '0' + currentPanel.m2}:${currentPanel.s2 > 9 ? currentPanel.s2 : '0' + currentPanel.s2}`;

            if (currentPanel.timerMode === 'R') {
                timerBtMode.textContent = '倒计时';
                timerBtMode.className = 'timer-mode reduce'

                maskDivDocs[1].style.display = 'block';
                maskDivDocs[2].style.display = 'none';
            } else {
                timerBtMode.textContent = '正计时';
                timerBtMode.className = 'timer-mode increase'

                maskDivDocs[1].style.display = 'none';
                maskDivDocs[2].style.display = 'block';
            }
            console.log('currentPanel', currentPanel);
            onOff(onOffDoc);
        }
        fillForm(dataMap.get(e.currentTarget.id))
        contentShow('skill');

    })
}

function contentShow(type) {
    switch (type) {
        case 'skill':
            if (window.innerWidth < 450) {
                sectionDoc.style.display = 'none';
                contentDoc.style.display = 'none';
                asideDoc.style.display = 'flex';
                skillInfoDoc.style.display = 'block';
            } else {
                asideDoc.style.display = 'flex';
                contentDoc.style.display = 'none';
                skillInfoDoc.style.display = 'block';
            }
            break;
        case 'menu':
            if (window.innerWidth < 450) {
                sectionDoc.style.display = 'none';
                skillInfoDoc.style.display = 'none';
                asideDoc.style.display = 'flex';
                contentDoc.style.display = 'flex';
            } else {
                asideDoc.style.display = 'flex';
                skillInfoDoc.style.display = 'none';
                contentDoc.style.display = 'flex';
            }
            break;
        default:
            if (window.innerWidth < 450) {
                sectionDoc.style.display = 'flex';
                asideDoc.style.display = 'none';
            } else {
                asideDoc.style.display = 'flex';
                skillInfoDoc.style.display = 'none';
                contentDoc.style.display = 'flex';
            }
    }
}
function fillPanel(div, data) {
    div.innerHTML = `
    <h2>${data.skillName}</h2>
    <p>你要用<b>${data.skillTime}</b>个小时来学会<strong>${data.skillName}</strong>,要是学不会<strong>${data.skillName}</strong>你将生不如死!</p>
    <ul>
        <li>累计学习:<b>${data.addUp || 0}</b>小时</li>
        <li>今天计划学:<b>${data.todayTime}</b>小时</li>
        <li>今天已学习:<b>${data.todayAddUp || 0}</b>小时</li>
        <li>今天还需学:<b>${data.todayNeedTime || data.todayTime}</b>小时</li>
        <li>距离学会还剩:<b>${data.sumNeedTime || data.skillTime}</b>小时</li>
</ul>
<button id=${data.id} type="button" class="start-skill on"></button>`
}
function fillForm(item) {
    for (const key in item) {
        let input = document.getElementById(key)
        if (!input) {
            input = document.createElement('input');
            input.id = key;
            input.type = 'hidden';
            input.name = key;
            input.value = item[key];
            formDoc.appendChild(input);
        } else if (input.type === 'range') {
            input.value = item[key];
            updateDuration(input)
        } else {
            input.value = item[key];
        }
    }
}

function getSkillId() {
    if (localStorage.getItem('skillId')) {
        let id = Number(localStorage.getItem('skillId')) + 1
        localStorage.setItem('skillId', id)
        return id;
    } else {
        localStorage.setItem('skillId', 1);
        return 1;
    }
}
// 计时
const onOffDoc = document.querySelector('#onOff');
const timeShows = document.querySelectorAll('.time-show');
let intervalId;
let intervalId2;
onOffDoc.addEventListener('click', (e) => {
    onOff(e.target);
})
let logItem = {};
function getNowDate(value) {
    const date = new Date(value);
    return `${date.getFullYear()}-${date.getMonth() + 1 > 9 ? date.getMonth() + 1 : '0' + (date.getMonth() + 1)}-${date.getDate() > 9 ? date.getDate() : '0' + date.getDate()} 
    ${date.getHours() > 9 ? date.getHours() : '0' + date.getHours()}:${date.getMinutes() > 9 ? date.getMinutes() : '0' + date.getMinutes()}:${date.getSeconds() > 9 ? date.getSeconds() : '0' + date.getSeconds()}`
}
function onOff(obj) {
    if (obj.value === 'off') {
        obj.value = 'on';
        obj.className='on-off on'
        clearInterval(intervalId);
        clearInterval(intervalId2);
        //保存日志
        logItem.endDateTime = Date.now();
        logItem.duration = logItem.endDateTime - logItem.startDateTime;
        updateDataToStore2(logItem);
    } else {
        //开启日志
        logItem.startDateTime = Date.now();
        logItem.skillName = currentPanel.skillName;
        logItem.skillId = currentPanel.id;
        obj.value = 'off';
        obj.className='on-off off'
        intervalId = setInterval(run, 1000);
        intervalId2 = setInterval(run2, 1000);
    }
}

function run() {
    currentPanel.s++;
    if (currentPanel.s == 60) {
        currentPanel.s = 0;
        currentPanel.m++;
    }
    if (currentPanel.m == 60) {
        currentPanel.m = 0;
        currentPanel.h++;
        currentPanel.addUp++;
        currentPanel.todayAddUp++;
    }
    timeShows[0].textContent = `${currentPanel.h > 9 ? currentPanel.h : '0' + currentPanel.h}:${currentPanel.m > 9 ? currentPanel.m : '0' + currentPanel.m}:${currentPanel.s > 9 ? currentPanel.s : '0' + currentPanel.s}`;

}

const timerBtMode = document.querySelector('.timer-mode');
timerBtMode.addEventListener('click', (e) => {
    if (e.target.textContent === '倒计时') {
        e.target.textContent = '正计时';
        currentPanel.timerMode = 'I'
        e.target.className = 'timer-mode increase'
        maskDivDocs[1].style.display = 'none';
        maskDivDocs[2].style.display = 'block';
    } else {
        e.target.textContent = '倒计时';
        currentPanel.timerMode = 'R'
        e.target.className = 'timer-mode reduce'
        maskDivDocs[2].style.display = 'none';
        maskDivDocs[1].style.display = 'block';
    }
})
function run2() {
    if (currentPanel.m2 == 0 && currentPanel.s2 == 0) {
        currentPanel.m2 = 60;
        currentPanel.h2--;
        currentPanel.sumNeedTime--;
        currentPanel.todayNeedTime--;
        updateDataToStore(currentPanel);

    }
    if (currentPanel.s2 == 0) {
        currentPanel.s2 = 60;
        currentPanel.m2--;
        updateDataToStore(currentPanel);

    }
    currentPanel.s2--;
    // console.log(`${currentPanel.h2 > 9 ? currentPanel.h2 : '0' + currentPanel.h2}:${currentPanel.m2 > 9 ? currentPanel.m2 : '0' + currentPanel.m2}:${currentPanel.s2 > 9 ? currentPanel.s2 : '0' + currentPanel.s2}`);

    timeShows[1].textContent = `${currentPanel.h2 > 9 ? currentPanel.h2 : '0' + currentPanel.h2}:${currentPanel.m2 > 9 ? currentPanel.m2 : '0' + currentPanel.m2}:${currentPanel.s2 > 9 ? currentPanel.s2 : '0' + currentPanel.s2}`;

}

maskBtDoc.addEventListener('keydown', (e) => {
    e.preventDefault();
    if (e.code === 'Escape') {
        maskBtDoc.style.visibility = 'hidden';
        //看板更新
        const div = document.getElementById(currentPanel.id);
        fillPanel(div, currentPanel);
        sectionDoc.prepend(div);

        clearInterval(intervalId);
        clearInterval(intervalId2);
        //数据库更新
        updateDataToStore(currentPanel);
        //日志
        logItem.endDateTime = Date.now();
        logItem.duration = logItem.endDateTime - logItem.startDateTime;
        updateDataToStore2(logItem);
    } else if (e.code === 'Space') {
        onOff(onOffDoc);
    }

})
const liTagDocs = document.querySelectorAll('.content li');
console.log(liTagDocs);

// 监听a标签
contentDoc.addEventListener('click', (e) => {
    switch (e.target.id) {
        case 'log':
            contentDivDoc[0].style.display = 'block';
            contentDivDoc[1].style.display = 'none';
            contentDivDoc[2].style.display = 'none';
            liTagDocs[0].style.background = '#EEE';
            liTagDocs[1].style.background = 'inherit';
            liTagDocs[2].style.background = 'inherit';
            break;
        case 'statistics':
            contentDivDoc[0].style.display = 'none';
            contentDivDoc[1].style.display = 'block';
            contentDivDoc[2].style.display = 'none';
            liTagDocs[0].style.background = 'inherit';
            liTagDocs[1].style.background = '#EEE';
            liTagDocs[2].style.background = 'inherit';
            break;
        case 'instructions':
            contentDivDoc[0].style.display = 'none';
            contentDivDoc[1].style.display = 'none';
            contentDivDoc[2].style.display = 'block';
            liTagDocs[0].style.background = 'inherit';
            liTagDocs[1].style.background = 'inherit';
            liTagDocs[2].style.background = '#EEE';
            break;
        default:
            break;
    }
})
// 监听图标切换
const swtichBtDoc = document.querySelector('.switch');
swtichBtDoc.addEventListener('click', (e) => {
    if (e.target.textContent == '年') {
        e.target.textContent = '月';
        selectSkillLogToStatistics(12);
    } else {
        e.target.textContent = '年';
        selectSkillLogToStatistics(1);
    }
})
// 监听页面关闭
window.addEventListener('unload', () => {
    logItem.endDateTime = Date.now();
    logItem.duration = logItem.endDateTime - logItem.startDateTime;
    updateDataToStore2(logItem);
})

// 后台运行逻辑
const worke = new Worker('js/timer.js')
document.addEventListener('visibilitychange', () => {
    if (document.hidden && maskBtDoc.style.visibility === 'visible') {
        console.log('页面隐藏，降低任务频率');
        worke.postMessage(['start', currentPanel])
        // 调整任务逻辑
    } else if (!document.hidden && maskBtDoc.style.visibility === 'visible') {

        worke.postMessage('end')
        worke.onmessage = (e) => {
            currentPanel = e.data;
            console.log('时间', e.data);
        }
        console.log('页面激活，恢复任务频率');
        // 恢复任务逻辑
    }
});

// 统计图
const tooltip = document.querySelector('.tooltip');
const offscreenCanvas = new OffscreenCanvas(300, 260);
const offCtx = offscreenCanvas.getContext('2d');
const canvas = document.getElementById('lineChart');
const ctx = canvas.getContext('2d');

// 绘制坐标系和刻度
function drawGrid(maxData) {
    const padding = 30;
    const width = offscreenCanvas.width - padding * 2;
    const height = offscreenCanvas.height - padding * 2;
    const stepX = width / (list.length - 1);
    const stepY = height / maxData;

    // 绘制 X 轴和 Y 轴
    offCtx.beginPath();
    offCtx.moveTo(padding, padding - 15);
    offCtx.lineTo(padding, offscreenCanvas.height - padding);
    offCtx.lineTo(offscreenCanvas.width - padding + 15, offscreenCanvas.height - padding);
    offCtx.strokeStyle = '#000';
    offCtx.stroke();
    offCtx.font = '14px monospace';
    offCtx.fillText(maxData == 15 ? '月度统计' : '年度统计', offscreenCanvas.width / 2, padding / 2);
    offCtx.font = '12px monospace';

    // 绘制 X 轴刻度
    list.forEach((item, i) => {
        const x = padding + i * stepX;
        if (maxData == 15 && i != 0 && i % 4 == 0) {
            offCtx.moveTo(x, offscreenCanvas.height - padding)
            offCtx.lineTo(x, offscreenCanvas.height - padding + 5)
            offCtx.stroke();
            offCtx.fillText(item.day > 9 ? item.day : '0' + item.day, x - 3, offscreenCanvas.height - padding + 20);
        }
        if (maxData == 450 && i != 0 && i % 2 == 0) {
            offCtx.moveTo(x, offscreenCanvas.height - padding)
            offCtx.lineTo(x, offscreenCanvas.height - padding + 5)
            offCtx.stroke();
            offCtx.fillText(item.month + 1 > 9 ? item.month + 1 : '0' + (item.month + 1), x - 3, offscreenCanvas.height - padding + 20);
        }
    });

    // 绘制 Y 轴刻度
    for (let i = 0; i <= maxData; i++) {
        const y = offscreenCanvas.height - padding - (i * stepY);
        if (maxData == 15 && i != 0 && i % 3 == 0) {
            offCtx.moveTo(padding - 5, y)
            offCtx.lineTo(padding, y)
            offCtx.stroke();
            offCtx.fillText(i > 9 ? i : '0' + i, padding - 22, y + 3);
        }
        if (maxData == 450 && i != 0 && i % 50 == 0) {
            offCtx.moveTo(padding - 5, y)
            offCtx.lineTo(padding, y)
            offCtx.stroke();
            offCtx.fillText(i > 9 ? i : '0' + i, padding - 30, y + 3);
            i += 59;

        } 
    }
}

// 绘制折线
function drawLine(maxData) {
    const padding = 30;
    const width = offscreenCanvas.width - padding * 2;
    const height = offscreenCanvas.height - padding * 2;
    const stepX = width / (list.length - 1);
    const stepY = height / maxData;

    offCtx.beginPath();
    offCtx.moveTo(padding, offscreenCanvas.height - padding - (list[0].data * stepY));


    // 绘制折线
    list.forEach((point, i) => {
        const x = padding + i * stepX;
        const y = offscreenCanvas.height - padding - (point.data * stepY);
        offCtx.lineTo(x, y);
    });

    offCtx.strokeStyle = '#FF5733'; // 折线颜色
    offCtx.lineWidth = 2;
    offCtx.stroke();
}
let dataXY = [];
// 绘制数据点
function drawDataPoints(maxData) {
    const padding = 30;
    const width = offscreenCanvas.width - padding * 2;
    const height = offscreenCanvas.height - padding * 2;
    const stepX = width / (list.length - 1);
    const stepY = height / maxData;
    dataXY = []

    // 绘制每个数据点
    list.forEach((point, i) => {
        const x = padding + i * stepX;
        const y = offscreenCanvas.height - padding - (point.data * stepY);
        dataXY.push({ 'x': x, 'y': y })
        offCtx.beginPath();
        offCtx.arc(x, y, 2, 0, 2 * Math.PI);
        offCtx.fillStyle = '#FF5733';
        offCtx.fill();
    });
    offCtx.fillStyle = '#000';

}
// 显示 Tooltip
function showTooltip(event) {
    const padding = 30;
    ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height)
    const mouseX = event.offsetX;
    const mouseY = event.offsetY;
    if (mouseX < padding || mouseY < padding / 2 || mouseX > canvas.width - padding / 2 || mouseY > canvas.height - padding) {
        ctx.drawImage(offscreenCanvas, 0, 0);
        tooltip.style.display = 'none';

        return;
    }
    const width = offscreenCanvas.width - padding * 2;
    const height = offscreenCanvas.height - padding * 2;
    const stepX = width / (list.length - 1);
    const stepY = height / list.length == 12 ? 450 : 15;

    ctx.drawImage(offscreenCanvas, 0, 0);
    ctx.beginPath();
    ctx.moveTo(padding, mouseY);
    ctx.lineTo(offscreenCanvas.width - padding, mouseY);
    ctx.moveTo(mouseX, padding);
    ctx.lineTo(mouseX, offscreenCanvas.height - padding);
    ctx.strokeStyle = '#8a8a8a';
    ctx.stroke();
    dataXY.some((item, i) => {
        if (Math.floor(item.x / 10) == Math.floor(mouseX / 10)) {
            tooltip.style.display = 'block';
            tooltip.style.left = `${mouseX + 10}px`;
            tooltip.style.top = `${mouseY - 30}px`;
            tooltip.innerText = `${list[i].label}: ${list[i].data}h`;
            return true;
        } else {
            tooltip.style.display = 'none';
        }
    })
}

// 初始化绘制
function initChart(maxData) {
    offCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    drawGrid(maxData);
    drawLine(maxData);
    drawDataPoints(maxData);
    ctx.drawImage(offscreenCanvas, 0, 0);

}

// 监听鼠标移动事件
canvas.addEventListener('mousemove', showTooltip);


