// ================== 游戏状态 ==================
const state = {
  attachmentViewed: false,
  searchUnlocked: false,
  mapUnlocked: false,
  evidenceUnlocked: false,
  yunmenUnlocked: false,
  jiangyuanUnlocked: false,
  portalVisited: false,
  hiddenCommentFound: false,
  mailRead: [],
  evidence: [], // {name, desc, jump}
  ch2: {
    firstContactDone: false, // 全章只发生一次的"记者身份必败"教学
    visited: {},             // contactId/phoneId -> 'success' | 'burned' | 'phone'
    unlockedPhones: [],      // 已解锁的备用亲属 phone id 列表
    unlockedTowns: ['zaoling'], // 驾车走访路线上已解锁的乡镇
    neighborVisited: {},     // 是否已与该乡镇的引路人交谈
    unlockedContacts: {},    // villageKey -> 已解锁的主证人 id 列表
    currentHome: null,       // 当前展示的入户走访场景
    currentVillage: null
  },
  ch3: {
    hometownUnlocked: false, // 是否已搜到"正阳镇"这个地点
    judgmentEmailSent: false // 陈明轩是否已发来加密判决书邮件
  },
  finale: {
    publicationCallCompleted: false
  }
};

const PROGRESS_STORAGE_KEY = 'yunmen-game-progress-v1';
let progressStorageReady = false;

// 前三章集齐证据后解锁总结笔记；第四章先用行动笔记引导致电矿方，再进入结局。
const chapters = [
  {
    id: 1,
    title: '第一章 · 举报名单核实',
    required: ['恒源矿难亡者名单（部分）', '新闻《恒源铁矿完成停产整顿阶段性验收》', '匿名网友评论残影'],
    note:
      '匿名评论说，2022年矿上死了三个人；这份名单里，2022年的记录竟然也正好是三个人，年份和人数都对上了。看来这份来路不明的名单并非凭空捏造——但它到底是不是真的，还得找到名单上的家属逐一核实。\n' +
      '而且，名单上为什么有这么多人来自江源县？\n' +
      '云门这边好歹还有个新闻门户，江源县那边，连个能打开的网站都没有。\n' +
      '现在直接去恒源铁矿，可能会打草惊蛇。看来这一趟，得从江源县开始，一个村一个村地去敲门了。',
    noteAdded: false
  },
  {
    id: 2,
    title: '第二章 · 江源县走访',
    required: [
      '恒源矿难佐证·枣岭乡',
      '恒源矿难佐证·庙坪乡·分而治之',
      '恒源矿难佐证·蒿溪镇',
      '恒源矿难佐证·石门镇'
    ],
    note:
      '江源县这几个村，几乎家家户户都有人去矿上打工，也几乎家家户户都死过人。这不是巧合——不只白玉海，庙坪、蒿溪和石门的家属也都提到，死者是经同一个大工头招募去恒源的。几份互不相干的口述，彼此对上了。\n' +
      '他们还反复提到，这个工头就是江源县本地人，常年在各乡镇招工，只是没人说得出他的姓名和具体住址。\n' +
      '更蹊跷的是庙坪乡那两家，矿上故意把他们分开安置谈判，这说明这根本不是零散的个案私了，而是一整套心照不宣的处理流程。\n' +
      '得查一下，这个工头是谁，他跟恒源铁矿到底是什么关系。',
    noteAdded: false
  },
  {
    id: 3,
    title: '第三章 · 工头之死',
    required: [
      '工头身份·法律简讯',
      '邱雨薇口述（待核实，立场明显）',
      '邱满仓刑事判决书全文',
      '责任分歧·矿主证言矛盾'
    ],
    note:
      '判决书写得明明白白——何长顺、白玉山这两起，我在枣岭乡听家属说的那些，跟判决书里的记录一字不差，这下总算对上号了。\n' +
      '难怪此前没人把邱满仓的判决和恒源铁矿联系起来：公开网页只含糊地说他因一桩“矿山经营相关案件”获刑十三年，既没有写明罪名，也没有列出涉事矿山、事故时间和死者姓名。完整判决书根本没有公开上线，单凭那条简讯，不可能和这份名单对得上。\n' +
      '更值得琢磨的是双龙铁矿那起，四个人被困，矿上却只报了一个死的——这手法，跟"白露事故"简直如出一辙，看来这套瞒报的路子，工头和矿上不是头一次用了。\n' +
      '可陆长仁那边一口咬定自己什么都不知道，跟邱满仓的说法完全对不上。这中间的责任到底该怎么算，恐怕不能只听一面之词——得去查查恒源矿业这些年的工商底细了。',
    noteAdded: false
  },
  {
    id: 4,
    title: '第四章 · 恒源矿业的账本',
    required: ['恒源矿业股东变更记录', '股权变更疑点', '陆长仁拒绝回应'],
    note: null,
    actionNoteAfter: ['恒源矿业股东变更记录', '股权变更疑点'],
    actionNoteUntil: '陆长仁拒绝回应',
    actionNote: '工商档案里留着恒源矿业办公室的公开电话。邱满仓在完整判决书里的供述，与陆长仁的证言正面冲突；股权变更的时间又恰好卡在案件审理期间。更关键的是，邱满仓案在2021年已经进入审理，名单却显示2022年仍有三名矿工死亡——后来是谁在处理赔偿和善后？发稿前必须给恒源矿业一次回应机会。现在就打这个电话，要求陆长仁说明情况。',
    noteAdded: false,
    isFinal: true
  }
];

// ================== 第二章：江源县走访数据 ==================
const villages = {
  zaoling: {
    key: 'zaoling',
    name: '枣岭乡',
    entranceImage: 'assets/zaoling-village-entrance.webp',
    intro: '车开进枣岭村，正是晌午，村口老槐树底下坐着几个乘凉的老人。',
    neighbor: {
      id: 'heDaye', name: '何大爷', role: '村口老人',
      portrait: 'assets/he-daye-character.webp',
      base: '何大爷："你们是来做啥的？这村里，唉，这些年好几个后生都是去外头挖矿，有的就没回来了。何长福家的、白玉海家的，都出过事。"\n叙述：何大爷抬手朝村里指了指。\n何大爷："顺着这条水泥路往里走，第一道灰门就是何长福家。白玉海家在老槐树后头那条岔路上。你们先去长福家问问吧。"',
      extra: {
        heChangfu: '何大爷："何长福那边不爱搭理外人，你们要问，倒是可以问问他儿子卫东，在太原打工，我这有个号码。"'
      }
    },
    contacts: [
      {
        id: 'heChangfu', name: '何长福', relation: '何长顺的弟弟', victim: '何长顺',
        image: 'assets/he-changfu-home.webp',
        portrait: 'assets/he-changfu-character.webp',
        success: '你："您好，我们是了解赔偿处理方式的法律工作者，最近接到一些类似情况，想了解一下您哥的事。"\n何长福（放松了些）："哦，了解赔偿的啊，行，我跟你说说……我哥是2007年在矿洞里被石头砸的，工队的人来家里谈的赔偿，是我爸在世时候处理的，一共给了25万。"',
        phone: {
          id: 'heWeidong', name: '何卫东', relation: '何长顺之子，太原打工',
          image: 'assets/phone-room.webp',
          portrait: 'assets/he-weidong-character.webp',
          text: '你（电话中）："您好，我们是《方圆周刊》记者，了解到您父亲何长顺2007年在恒源出的事，想跟您核实一下。"\n何卫东："哦……行，我爸是2007年在矿洞里被石头砸的，赔了25万，是我爷在世时候处理的。"'
        }
      },
      {
        id: 'baiYuhai', name: '白玉海', relation: '白玉山的堂哥', victim: '白玉山',
        image: 'assets/bai-yuhai-home.webp',
        portrait: 'assets/bai-yuhai-character.webp',
        success: '白玉海："我堂弟是2012年出的事，也是被石头砸的，赔了71万。这些年村里去矿上打工的，好几个都没了。都是跟着一个工头去的，具体是谁我不清楚，反正听说那人很有名气。"'
      }
    ],
    evidenceName: '恒源矿难佐证·枣岭乡',
    evidenceDesc: '何长顺（2007，赔25万）、白玉山（2012，赔71万）两起矿难均已核实，与第一章名单吻合，另获悉遇难矿工均受雇于同一"工头"承包的洞口（身份不明）。'
  },
  miaoping: {
    key: 'miaoping',
    name: '庙坪乡',
    entranceImage: 'assets/miaoping-village-entrance.webp',
    intro: '车开进庙坪乡，先到了石湾村，村口有一家代销店。',
    neighbor: {
      id: 'miaopingShop', name: '代销店老板', role: '村口代销店',
      portrait: 'assets/miaoping-shop-character.webp',
      base: '老板："方家和宋家啊，知道知道，同一天没的，都是矿上的事。方家在这石湾村，宋家在隔壁中坪村。"\n叙述：老板走到门口，指向代销店前分开的两条路。\n老板："左边上坡，第三户就是方建秋家。宋学文不住这边，问完方家以后沿右边这条路去中坪村。"',
      extra: {}
    },
    contacts: [
      {
        id: 'fangMingliang', name: '方建秋', relation: '方明启的弟弟', victim: '方明启',
        image: 'assets/fang-mingliang-home.webp',
        portrait: 'assets/fang-mingliang-character.webp',
        success: '你："您好，我们是了解赔偿处理方式的法律工作者，想了解一下您哥的事。"\n方建秋："我哥是2018年8月19号，跟人合伙打钻的时候被石头砸的，当场就没了……矿上找我们私了的，具体怎么谈的我没经手，是我们几个长辈去的，没让政府知道，反正就是私下解决。"\n你："他当时是怎么去恒源干活的？"\n方建秋："跟着一个大工头去的。那人也是江源县的，常年在这几个乡镇招人，谁家缺钱想下矿，都有人把他介绍过来。名字我真不知道。"'
      },
      {
        id: 'songXuewen', name: '宋学文', relation: '宋学发的三弟', victim: '宋学发',
        image: 'assets/song-xuewen-home.webp',
        portrait: 'assets/song-xuewen-character.webp',
        success: '宋学文："我哥跟方家那个是同一天出的事，我们赶到山西以后，矿上让我们直接去大同，不让我们去代县。说是方便谈赔偿，其实我们后来才反应过来，是故意把我们两家分开的。赔了116万，听说比方家还多几万。"\n你："你哥和方明启，是同一个人带去的吗？"\n宋学文："是，同一个大工头。听说他家就在江源县，逢年过节会回来，让下面的人在各村问谁愿意出去干活。具体住哪儿，我们没打听过。"'
      }
    ],
    evidenceName: '恒源矿难佐证·庙坪乡·分而治之',
    evidenceDesc: '方明启、宋学发同日死亡，矿方刻意将两家分开安置谈判赔偿，印证瞒报操作具有组织性；两家还分别提到，死者由同一名江源县籍大工头招募。'
  },
  haoxi: {
    key: 'haoxi',
    name: '蒿溪镇',
    entranceImage: 'assets/haoxi-village-entrance.webp',
    intro: '车开进蒿溪镇双星社区，几栋自建房挨在一起。',
    neighbor: {
      id: 'laoGe', name: '老葛', role: '同村工友',
      portrait: 'assets/laoge-character.webp',
      base: '老葛："刘显国啊，就住前头那栋，他堂弟刘富民就是在矿上没的，开车掉进竖井里，摔得可惨了。"\n叙述：老葛越过路边堆着的柴火，指向坡上那栋旧房子。\n老葛："蓝色农用车后头那条路一直上去，院门口堆着旧矿具的就是他家。"',
      extra: {}
    },
    contacts: [
      {
        id: 'liuXianguo', name: '刘显国', relation: '刘富民的堂兄', victim: '刘富民',
        image: 'assets/liu-xianguo-home-calendar.webp',
        portrait: 'assets/liu-xianguo-character.webp',
        special: 'comboLock',
        introText: '屋里很暗，墙边堆着当年下矿用过的东西，一只生锈的铁皮箱放在桌旁。\n\n刘显国："我弟兄是开自卸车往竖井里倒矿石，2018年10月那天，连人带车掉进去了，三百多米深，当场就没了……"\n你："他也是经人介绍去恒源的？"\n刘显国："对，跟着一个江源本地的大工头去的。那人手底下好几拨工人，枣岭、庙坪、石门都有，出事后也是他的人先来传话。"\n你："矿洞里具体是什么样的？"\n刘显国："恒源是平硐开采，从山底往山顶开了好几层洞口，中间打了竖井连通，运矿车把石头拉到竖井口倒下去，底下再装车运出来。"\n你："赔偿有留下什么书面东西吗？"\n刘显国："协议在，锁在我那个铁皮箱里，钥匙早不知道扔哪儿去了，是个密码锁……我这岁数记不住数字了，你们帮我拨一下呗，密码是我弟兄走的那天，月、日。"',
        comboCode: '1004',
        comboFailText: '刘显国皱眉："不对，你再想想，就是他走的那天。"',
        comboSuccessText: '铁皮箱"咔"一声弹开，露出里面泛黄的协议。'
      }
    ],
    evidenceName: '恒源矿难佐证·蒿溪镇',
    evidenceDescFull: '刘富民（2018年10月4日，运输车坠入竖井身亡）赔偿协议实拍，载明金额、日期与签署双方；家属另证实，他由一名江源县本地大工头招募。'
  },
  shimen: {
    key: 'shimen',
    name: '石门镇',
    entranceImage: 'assets/shimen-village-entrance.webp',
    intro: '车开进石门镇红崖村，村子建在半山腰上。',
    neighbor: {
      id: 'hongyaErshen', name: '红崖二婶', role: '邻居',
      portrait: 'assets/hongya-ershen-character.webp',
      base: '红崖二婶："思平家老四是2018年头上的事，好像是叫思远，岩爆砸的。"\n叙述：红崖二婶转过身，朝石墙边那条陡坡努了努嘴。\n红崖二婶："顺着坡往上，拐过那道石墙，门前有棵老核桃树的就是何思平家。"',
      extra: {}
    },
    contacts: [
      {
        id: 'heSiping', name: '何思平', relation: '何思远的大哥', victim: '何思远',
        image: 'assets/he-siping-home.webp',
        portrait: 'assets/he-siping-character.webp',
        success: '何思平："我弟是2018年1月20号，进恒源才一两个月，岩爆砸死的，赔了120万。"\n你："是谁介绍他进矿的？"\n何思平："还是江源县那个大工头。村里人都说他在外头包了不少矿洞，手底下缺人，就回江源一批批地带。我们只跟下面带班的接触过，没见过他本人。"'
      }
    ],
    evidenceName: '恒源矿难佐证·石门镇',
    evidenceDesc: '何思远，2018年1月20日岩爆身亡，赔偿120万，与第一章名单吻合；家属同样指认招工者是一名江源县本地大工头。'
  },
  zhengyang: {
    key: 'zhengyang',
    name: '正阳镇',
    entranceImage: 'assets/qiu-yuwei-home.webp',
    intro: '车开到正阳镇，邱满仓的老宅还留着，院子里晾着几件衣服，一个女人正在收拾东西，看见生人进来，愣了一下。',
    contacts: [
      {
        id: 'qiuYuwei', name: '邱雨薇', relation: '邱满仓之女',
        image: 'assets/qiu-yuwei-home.webp',
        portrait: 'assets/qiu-yuwei-character.webp',
        success: '叙述："车开到正阳镇，邱满仓的老宅还留着。院子里晾着几件衣服，一个女人正在收拾东西，看见生人进来，愣了一下。"\n你："您好，我们是《方圆周刊》记者，想向您了解一下邱满仓的情况。"\n邱雨薇（愣了一下，随即眼圈红了）："《方圆周刊》……是我给你们发的那封邮件。"\n你（意外）："那份名单，是您发的？"\n邱雨薇："对，是我发的。我爸这辈子干过不少糊涂事，瞒报死人这种事，我不否认他做过。但把他判得那么重，我不服——那些矿主呢？出了事拿钱私了的时候，矿主一分钱都不出，出了事全推给我爸一个人扛，凭什么？"\n你："能具体说说吗？"\n邱雨薇："我爸和矿上签的协议里写着，出了事故要按比例分摊赔偿，可矿主陆长仁在法庭上矢口否认有这回事，说什么"从来没有这种协议"。这案子是岱州市中级人民法院判的，你们要是不信我一面之词，自己去查判决书，上面写得清清楚楚。"'
      }
    ],
    evidenceName: '邱雨薇口述（待核实，立场明显）',
    evidenceDesc: '邱满仓之女，即本章匿名举报人。她认为父亲量刑过重、矿方未承担相应责任，但陈述带有明显立场，需以判决书等权威文本核实。'
  }
};

// ================== 工具函数 ==================
function toast(msg, duration = 2600) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), duration);
}

function addEvidence(name, desc, jump) {
  if (state.evidence.some(e => e.name === name)) return;
  state.evidence.push({ name, desc, jump });
  renderEvidence();
  toast('已收入证据夹：' + name);
  checkChapterProgress();
}

// 每次拿到新证据后，检查当前正在进行的章节是否已集齐；集齐才会解锁该章"记者笔记"
function checkChapterProgress() {
  const current = chapters.find(c => !c.noteAdded);
  if (!current) return;
  const collected = current.required.every(n => state.evidence.some(e => e.name === n));
  if (!collected) return;
  current.noteAdded = true;
  renderEvidence();
  if (current.isFinal) {
    setTimeout(showPublicationCall, 800);
  } else {
    setTimeout(() => toast('记者在笔记本上写下了一些想法。'), 600);
  }
}

function renderEvidence() {
  const list = document.getElementById('evidence-list');
  if (state.evidence.length === 0) {
    list.innerHTML = '<div class="evidence-empty">暂无证据</div>';
    return;
  }

  let html = '';
  chapters.forEach(ch => {
    const collectedNames = ch.required.filter(n => state.evidence.some(e => e.name === n));
    if (collectedNames.length === 0) return; // 该章节还没开始收集，不展示

    const done = collectedNames.length;
    const total = ch.required.length;
    const pct = Math.round((done / total) * 100);

    html += `
      <div class="chapter-progress">
        <div class="cp-title">${ch.title}</div>
        <div class="cp-bar"><div class="cp-fill" style="width:${pct}%"></div></div>
        <div class="cp-count">${done}/${total}${done === total ? '　✓ 已收集完整' : '　尚有遗漏，继续调查'}</div>
      </div>
    `;

    state.evidence.forEach((e, i) => {
      if (!ch.required.includes(e.name)) return;
      html += `
        <div class="evidence-item ${e.jump ? 'clickable' : ''}" data-idx="${i}">
          <div class="e-name">${e.name}${e.jump ? '<span class="e-jump-hint">前往来源 →</span>' : ''}</div>
          <div class="e-desc">${e.desc}</div>
        </div>
      `;
    });

    if (ch.noteAdded && ch.note) {
      html += `
        <div class="evidence-note">
          <div class="note-label">记者笔记</div>
          <div class="note-text">${ch.note}</div>
        </div>
      `;
    }

    const actionNoteReady = ch.actionNote && ch.actionNoteAfter.every(name => state.evidence.some(e => e.name === name));
    const actionNoteFinished = ch.actionNoteUntil && state.evidence.some(e => e.name === ch.actionNoteUntil);
    if (actionNoteReady && !actionNoteFinished) {
      html += `
        <div class="evidence-note action-note">
          <div class="note-label">记者笔记 · 下一步</div>
          <div class="note-text">${ch.actionNote}</div>
        </div>
      `;
    }
  });

  list.innerHTML = html;

  list.querySelectorAll('.evidence-item.clickable').forEach(el => {
    el.addEventListener('click', () => {
      const idx = Number(el.dataset.idx);
      const item = state.evidence[idx];
      if (item && item.jump) item.jump();
    });
  });
}

// ---- 跳转到证据来源 ----
function selectMailById(id) {
  document.querySelectorAll('.mail-item').forEach(i => {
    i.classList.toggle('selected', i.dataset.mail === id);
    if (i.dataset.mail === id) markMailRead(id, i);
  });
  updateMailUnreadCount();
  renderMailDetail(id);
}

function jumpToTipMail() {
  switchApp('app-mail');
  selectMailById('tip');
  openPdfModal();
}

function jumpToPortalArticle(key) {
  switchApp('app-portal');
  openPortalArticle(key, true);
}

function jumpToHiddenComment() {
  switchApp('app-portal');
  openPortalArticle('hengyuan', true);
}

function unlockDock(appId) {
  const icon = document.getElementById('dock-' + appId.replace('app-', ''));
  if (icon && icon.classList.contains('locked')) {
    icon.classList.remove('locked');
    icon.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }],
      { duration: 400 }
    );
  }
}

function switchApp(appId) {
  document.querySelectorAll('.app-window').forEach(w => w.classList.add('hidden'));
  document.getElementById(appId).classList.remove('hidden');
  document.querySelectorAll('.dock-icon').forEach(d => d.classList.remove('active'));
  const dockIcon = document.querySelector(`.dock-icon[data-app="${appId}"]`);
  if (dockIcon) dockIcon.classList.add('active');
}

// ================== 邮箱逻辑 ==================
const mailData = {
  notice1: {
    from: '编辑部通知', subject: '下周三选题会，请提前提交选题', time: '昨天 18:02',
    body: '各位老师：\n\n下周三（10:00）召开本月第二次选题会，请各位提前准备好选题提纲，发到选题群里。\n\n编辑部'
  },
  notice2: {
    from: '财务部', subject: '3月差旅报销提醒', time: '昨天 09:15',
    body: '各位同事：\n\n3月份差旅报销将于本月25日截止，请尽快提交发票原件至财务室，逾期不再受理本月报销。\n\n财务部'
  },
  tip: {
    from: 'jm_2003********@163.com', subject: '【无主题】', time: '今天 04:47',
    body: '我知道的事情说出来会死人的，但是不说我良心过不去。\n\n恒源铁矿这些年死了很多人，都没有上报，都是私下花钱解决的。矿上的人叫这个是"私了"。附件是我知道的一部分名单，村里、乡里都有，你自己去查，我不能再说更多了。\n\n这封邮箱我发完就不会再用了。',
    attachment: true
  }
};

function renderMailDetail(id) {
  const mail = mailData[id];
  const detail = document.getElementById('mail-detail');
  document.querySelector('.mail-body').classList.add('reading');
  const senderInitial = mail.from.includes('编辑') ? '编' : mail.from.includes('财务') ? '财' : mail.from.includes('陈明轩') ? '陈' : '匿';
  let html = `
    <div class="mail-reader-tools"><button title="返回">←</button><button title="归档">□</button><button title="删除">⌫</button><span></span><button title="回复">↩ 回复</button><button title="更多">•••</button></div>
    <article class="mail-message">
      <div class="mail-message-label">收件箱</div>
      <h2>${mail.subject}</h2>
      <div class="mail-sender">
        <div class="mail-avatar detail-avatar">${senderInitial}</div>
        <div class="mail-sender-copy"><strong>${mail.from}</strong><span>发送给：沈知行 &lt;shenzhixing@fangyuanweekly.com&gt;</span></div>
        <time>${mail.time}</time>
      </div>
      <div class="mail-text">${mail.body}</div>
  `;
  if (mail.attachment) {
    html += `
      <div class="mail-attachment-label">附件（1）</div>
      <div class="mail-attachment" id="attachment-link">
        <div class="pdf-icon">${mail.attachmentLocked ? '🔒' : 'PDF'}</div>
        <div class="attachment-copy"><strong>${mail.attachmentName || '恒源铁矿死亡矿工名单.pdf'}</strong><span>${mail.attachmentLocked ? '加密文件 · 点击解锁' : 'PDF 文档 · 2.1 MB'}</span></div>
        <div class="attachment-open">打开 ›</div>
      </div>
    `;
  }
  html += '<div class="mail-reply-box">↩　点击此处回复发件人……</div></article>';
  detail.innerHTML = html;

  if (mail.attachment) {
    document.getElementById('attachment-link').addEventListener('click', mail.attachmentHandler || openPdfModal);
  }
  const readerButtons = detail.querySelectorAll('.mail-reader-tools button');
  readerButtons[0].addEventListener('click', () => {
    document.querySelectorAll('.mail-item').forEach(i => i.classList.remove('selected'));
    document.querySelector('.mail-body').classList.remove('reading');
    detail.innerHTML = '<div class="mail-placeholder"><div class="mail-placeholder-icon">✉️</div><strong>选择一封邮件开始阅读</strong><span>邮件内容将在这里显示</span></div>';
  });
  readerButtons.forEach((button, index) => {
    if (index > 0) button.addEventListener('click', () => toast('调查邮箱目前处于只读模式。'));
  });
  detail.querySelector('.mail-reply-box').addEventListener('click', () => toast('调查邮箱目前处于只读模式。'));
}

document.querySelectorAll('.mail-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.mail-item').forEach(i => i.classList.remove('selected'));
    item.classList.add('selected');
    markMailRead(item.dataset.mail, item);
    renderMailDetail(item.dataset.mail);
  });
});

function markMailRead(id, item) {
  if (!state.mailRead.includes(id)) state.mailRead.push(id);
  if (item) item.classList.remove('unread');
  updateMailUnreadCount();
}

function inferReadMailsFromProgress() {
  const remember = id => {
    if (!state.mailRead.includes(id)) state.mailRead.push(id);
  };
  if (state.attachmentViewed) remember('tip');
  const progressedAfterFirstRejection = Object.values(state.ch2.visited)
    .some(status => status === 'success' || status === 'phone');
  if (state.ch2.firstContactDone && progressedAfterFirstRejection) remember('editorTip');
  if (state.evidence.some(item => item.name === '邱满仓刑事判决书全文')) remember('judgmentDoc');
}

function updateMailUnreadCount() {
  const list = document.getElementById('mail-list');
  const unread = list.querySelectorAll('.mail-item.unread').length;
  const total = list.querySelectorAll('.mail-item').length;
  const unreadEl = document.getElementById('mail-unread-count');
  const dockUnreadEl = document.getElementById('mail-dock-unread');
  const countEl = document.getElementById('mail-count-label');
  if (unreadEl) {
    unreadEl.textContent = unread;
    unreadEl.classList.toggle('empty', unread === 0);
  }
  if (dockUnreadEl) {
    dockUnreadEl.textContent = unread > 9 ? '9+' : unread;
    dockUnreadEl.classList.toggle('empty', unread === 0);
    dockUnreadEl.setAttribute('aria-label', `${unread} 封未读邮件`);
  }
  if (countEl) countEl.textContent = `${total} 封邮件${unread ? ` · ${unread} 封未读` : ''}`;
}

document.getElementById('mail-search-input').addEventListener('input', e => {
  const query = e.target.value.trim().toLowerCase();
  document.querySelectorAll('#mail-list .mail-item').forEach(item => {
    item.classList.toggle('mail-filtered', !!query && !item.textContent.toLowerCase().includes(query));
  });
});
document.getElementById('mail-refresh').addEventListener('click', () => toast('邮件已是最新状态。'));
document.querySelector('.mail-compose').addEventListener('click', () => toast('调查期间暂不支持主动发信。'));
document.querySelectorAll('.mail-folder').forEach(folder => {
  folder.addEventListener('click', () => {
    if (folder.classList.contains('active')) return;
    toast('这个文件夹里暂时没有邮件。');
  });
});
const initialTipItem = document.querySelector('.mail-item[data-mail="tip"]');
if (initialTipItem) document.getElementById('mail-list').prepend(initialTipItem);
updateMailUnreadCount();

// ================== 名单 PDF 弹窗 ==================
const nameListRows = [
  ['1', '何长顺', '宁越市 · 枣岭乡枣岭村', '2007', '洞内落石'],
  ['2', '白玉山', '江源县 · 枣岭乡枣岭村', '2012', '洞内落石'],
  ['3', '王守成', '江源██（乡镇不详）', '2014', '塌方，与另外三人一起'],
  ['4', '李根', '██省 · 江源县', '2014', '塌方'],
  ['5', '马文举', '宁越市 · 县名被墨渍覆盖', '2014', '塌方'],
  ['6', '赵老四', '江源县（村名残缺）', '2014', '塌方'],
  ['7', '何思远', '江源县石门镇红崖村', '2018', '岩爆'],
  ['8', '方明启', '宁越市 · 庙坪乡石湾村', '2018', '落石'],
  ['9', '宋学发', '江源县庙坪乡中坪村', '2018', '落石，与方明启同日'],
  ['10', '吴仁贵', '一说澜川省雾溪县，具体不详', '2018', '打钻时失踪，后确认死亡'],
  ['11', '刘富民', '江源县蒿溪镇双星社区', '2018', '运输车坠井'],
  ['12', '王正山', '宁越市 · 江源以南山区', '2022', '风管爆裂'],
  ['13', '吴涛', '江源县洪山镇（具体不详）', '2022', '冒顶'],
  ['14', '王小桥', '只知姓名，籍贯不详', '2022', '与吴涛同日'],
];
function buildPdfTable() {
  const body = document.getElementById('pdf-table-body');
  const html = nameListRows.map(r => `
    <tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td></tr>
  `).join('');
  body.innerHTML = html;
}
buildPdfTable();

function openPdfModal() {
  document.getElementById('pdf-modal').classList.remove('hidden');
  if (!state.attachmentViewed) {
    state.attachmentViewed = true;
    addEvidence('恒源矿难亡者名单（部分）', '匿名举报人提供的14人残缺名单。省名和县名散落在不同籍贯记录中，需要通过重复出现的乡村信息自行拼接，并实地核查。', jumpToTipMail);
    state.evidenceUnlocked = true;
    unlockDock('app-evidence');
    state.searchUnlocked = true;
    unlockDock('app-search');
    setTimeout(() => toast('已解锁：搜索引擎、证据夹'), 500);
  }
}
document.getElementById('pdf-close').addEventListener('click', () => {
  document.getElementById('pdf-modal').classList.add('hidden');
});

// ================== 搜索引擎逻辑 ==================
function doSearch() {
  const q = document.getElementById('search-input').value.trim();
  const results = document.getElementById('search-results');
  if (!q) { results.innerHTML = ''; return; }

  if (q.includes('云门') || (q.includes('岱州') && q.includes('云门'))) {
    results.innerHTML = `
      <div class="result-card" id="result-portal">
        <div class="r-title">云门在线 —— 云门县本地新闻门户</div>
        <div class="r-url">www.yunmen-online.cn</div>
        <div class="r-desc">云门县唯一官方指定综合信息门户，本地新闻、政务公开、便民服务一站直达。</div>
      </div>
    `;
    document.getElementById('result-portal').addEventListener('click', () => {
      switchApp('app-portal');
      if (!state.yunmenUnlocked) {
        state.yunmenUnlocked = true;
        unlockRegion('yunmen');
        if (!state.mapUnlocked) { state.mapUnlocked = true; unlockDock('app-map'); }
        toast('新地区已解锁：岱州市云门县。地图已更新。');
      }
    });
  } else if (q.includes('江源') || (q.includes('宁越') && q.includes('江源'))) {
    results.innerHTML = `
      <div class="result-card disabled">
        <div class="r-title" style="color:#888;">江源在线</div>
        <div class="r-url">网站建设中，暂无法访问</div>
        <div class="r-desc">该地区信息闭塞，暂无有效线上资料，需实地走访。</div>
      </div>
    `;
    if (!state.jiangyuanUnlocked) {
      state.jiangyuanUnlocked = true;
      unlockRegion('jiangyuan', true);
      if (!state.mapUnlocked) { state.mapUnlocked = true; unlockDock('app-map'); }
      toast('新地区已解锁：宁越市江源县。地图已更新——但当地暂无有效线上信息，需实地走访。');
    }
  } else if (q.includes('恒源') && q.includes('工头')) {
    results.innerHTML = `
      <div class="result-card" id="result-legalbrief">
        <div class="r-title">云门在线 —— 云门法院通报一起矿山领域案件审理结果</div>
        <div class="r-url">www.yunmen-online.cn/news/2023/0618/1847.html</div>
        <div class="r-desc">岱州市中级人民法院近日通报一起矿山经营相关案件审理结果。被告人邱满仓获刑十三年，具体罪名、涉事企业及案情未予披露；其后于服刑期间病故。</div>
      </div>
    `;
    document.getElementById('result-legalbrief').addEventListener('click', () => {
      switchApp('app-portal');
      openPortalArticle('qiuCase', true);
    });
  } else if (q.includes('法院')) {
    results.innerHTML = `
      <div class="result-card" id="result-courtbulletin">
        <div class="r-title">岱州市中级人民法院 —— 公开宣判信息</div>
        <div class="r-url">www.daizhoucourt.gov.cn</div>
        <div class="r-desc">一宗矿山经营相关案件已作出终审裁判，被告人邱满仓获刑十三年。公开信息未列明具体罪名和案情。</div>
      </div>
    `;
    document.getElementById('result-courtbulletin').addEventListener('click', () => {
      openStandalonePage('court');
    });
  } else if (q.includes('邱满仓')) {
    results.innerHTML = `
      <div class="result-card" id="result-hometown">
        <div class="r-title">正阳镇吧 —— 说说邱满仓下葬的事</div>
        <div class="r-url">tieba.yunmen-online.cn/zhengyang</div>
        <div class="r-desc">网友讨论：邱满仓老家是正阳镇的，前阵子刚下葬，来送葬的老乡不少，听说都是当年跟着他去矿上的。</div>
      </div>
    `;
    document.getElementById('result-hometown').addEventListener('click', () => {
      openStandalonePage('forum');
    });
  } else if (q.includes('恒源矿业') && q.includes('工商')) {
    results.innerHTML = `
      <div class="result-card" id="result-registry">
        <div class="r-title">恒源矿业有限责任公司 —— 企业信用信息公示</div>
        <div class="r-url">www.gsxt.gov.cn/xxxxx</div>
        <div class="r-desc">统一社会信用代码、法定代表人、注册资本、历史股东变更等信息可查。</div>
      </div>
    `;
    document.getElementById('result-registry').addEventListener('click', openRegistryDocument);
  } else {
    results.innerHTML = `<div class="no-result">未找到与"${escapeHtml(q)}"相关的结果。</div>`;
  }
}

function jumpToSearch(query) {
  switchApp('app-search');
  document.getElementById('search-input').value = query;
  doSearch();
}
document.getElementById('search-btn').addEventListener('click', doSearch);
document.getElementById('search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch();
});

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// ================== 地图逻辑 ==================
let provinceMapHTML = null;

function unlockRegion() {
  renderProvinceMap();
}

function renderProvinceMap() {
  const content = document.getElementById('map-content');
  if (provinceMapHTML === null) provinceMapHTML = content.innerHTML;
  content.className = 'province-map-shell';
  content.innerHTML = provinceMapHTML;

  if (state.yunmenUnlocked) document.getElementById('region-yunmen').classList.add('unlocked');
  if (state.jiangyuanUnlocked) document.getElementById('region-jiangyuan').classList.add('locked-visible');
  updateMapHint();

  document.getElementById('region-jiangyuan').addEventListener('click', () => {
    if (!state.jiangyuanUnlocked) return;
    const ch1 = chapters.find(c => c.id === 1);
    if (!ch1.noteAdded) { toast('目前线索还不够，先把第一章的证据整理完。'); return; }
    renderTownships();
  });
  document.getElementById('region-yunmen').addEventListener('click', () => {
    if (!state.yunmenUnlocked) return;
    toast('恒源铁矿的调查还得等等——现在贸然过去，可能会打草惊蛇。');
  });
}

function updateMapHint() {
  const hint = document.getElementById('map-hint');
  if (!hint) return;
  if (state.yunmenUnlocked && state.jiangyuanUnlocked) {
    hint.textContent = '云门县已有本地新闻可查；点击江源县，前往乡镇走访。';
  } else if (state.yunmenUnlocked) {
    hint.textContent = '云门县区域已加载。';
  } else if (state.jiangyuanUnlocked) {
    hint.textContent = '江源县区域已加载，但当地暂无线上信息，点击进入乡镇走访。';
  } else {
    hint.textContent = '地图尚未加载任何区域，请通过搜索引擎定位地点。';
  }
}

// 某个主证人是否已经"拿到信息"——当面成功，或者虽然被烧但已经通过电话拿到等效信息
function isContactDone(c) {
  const st = state.ch2.visited[c.id];
  if (st === 'success') return true;
  return !!(c.phone && state.ch2.visited[c.phone.id] === 'phone');
}

function villageStatus(key) {
  const v = villages[key];
  const done = v.contacts.filter(isContactDone).length;
  if (done === 0) return 'grey';
  if (done === v.contacts.length) return 'green';
  return 'yellow';
}

function isTownUnlocked(key) {
  return key === 'zhengyang'
    ? state.ch3.hometownUnlocked
    : state.ch2.unlockedTowns.includes(key);
}

const ch2TownOrder = ['zaoling', 'miaoping', 'haoxi', 'shimen'];
const storyImageLoads = new Map();
let villageTransitioning = false;

function preloadStoryImage(src) {
  if (!src) return Promise.resolve();
  if (storyImageLoads.has(src)) return storyImageLoads.get(src);
  const pending = new Promise(resolve => {
    const image = new Image();
    image.onload = async () => {
      try {
        if (image.decode) await image.decode();
      } catch (_) {
        // 图片已经成功载入时，即使浏览器不支持预解码也可继续。
      }
      resolve();
    };
    image.onerror = resolve;
    image.src = src;
  });
  storyImageLoads.set(src, pending);
  return pending;
}

function preloadVillageScene(key) {
  const village = villages[key];
  if (!village) return Promise.resolve();
  const firstCharacter = village.neighbor || village.contacts[0];
  return Promise.all([
    preloadStoryImage(village.entranceImage || village.contacts[0]?.image),
    preloadStoryImage(firstCharacter?.portrait)
  ]);
}

function getUnlockedContacts(villageKey) {
  return state.ch2.unlockedContacts[villageKey] || [];
}

function unlockContact(villageKey, contactId) {
  const ids = getUnlockedContacts(villageKey);
  if (ids.includes(contactId)) return false;
  state.ch2.unlockedContacts[villageKey] = [...ids, contactId];
  return true;
}

function unlockNextTown(villageKey) {
  const nextKey = ch2TownOrder[ch2TownOrder.indexOf(villageKey) + 1];
  if (!nextKey || state.ch2.unlockedTowns.includes(nextKey)) return;
  state.ch2.unlockedTowns.push(nextKey);
  renderTownships();
  setTimeout(() => toast(`驾车路线已更新：下一站·${villages[nextKey].name}`), 850);
}

function renderTownships() {
  const content = document.getElementById('map-content');
  const keys = ['zaoling', 'miaoping', 'haoxi', 'shimen'];
  if (state.ch3.hometownUnlocked) keys.push('zhengyang');
  keys.filter(isTownUnlocked).forEach(preloadVillageScene);
  content.className = 'route-map-shell';
  const positions = {
    zaoling: [20, 76], miaoping: [43, 59], haoxi: [65, 39], shimen: [84, 20], zhengyang: [49, 13]
  };
  const routeClass = key => {
    if (villageStatus(key) === 'green') return 'completed';
    return isTownUnlocked(key) ? 'active' : 'locked';
  };
  content.innerHTML = `
    <div class="route-map">
      <div class="route-map-title">江源县走访路线 <span>行程随核实进度延伸</span></div>
      <svg class="drive-route" viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden="true">
        <path class="route-shadow" d="M70 500 C120 470 150 445 200 425 S350 370 430 330 S570 270 650 220 S770 155 840 112"/>
        <path class="route-leg ${routeClass('zaoling')}" d="M70 500 C120 470 150 445 200 425"/>
        <path class="route-leg ${routeClass('miaoping')}" d="M200 425 C280 400 350 370 430 330"/>
        <path class="route-leg ${routeClass('haoxi')}" d="M430 330 C510 300 570 270 650 220"/>
        <path class="route-leg ${routeClass('shimen')}" d="M650 220 C730 180 770 145 840 112"/>
      </svg>
      <div class="route-origin"><span>🚙</span>江源县城</div>
      ${keys.map(k => {
        const v = villages[k];
        const unlocked = isTownUnlocked(k);
        const status = villageStatus(k);
        const statusText = !unlocked ? '🔒 待解锁' : status === 'green' ? '已核实' : status === 'yellow' ? '走访中' : '可走访';
        const [left, top] = positions[k];
        return `
          <div class="town-node ${unlocked ? '' : 'locked'}" data-town="${k}" style="left:${left}%;top:${top}%">
            <div class="town-dot ${unlocked ? status : 'locked'}"></div>
            <div class="town-name">${v.name}</div>
            <div class="town-status">${statusText}</div>
          </div>
        `;
      }).join('')}
      <div class="town-back" id="town-back">← 返回区域地图</div>
    </div>
  `;
  content.querySelectorAll('.town-node').forEach(node => {
    node.addEventListener('click', () => {
      if (node.classList.contains('locked')) {
        const next = ch2TownOrder.find(k => isTownUnlocked(k) && villageStatus(k) !== 'green');
        toast(`路线还没有延伸到这里。请先完成${next ? villages[next].name : '当前地点'}的核实。`);
        return;
      }
      enterVillage(node.dataset.town);
    });
  });
  document.getElementById('town-back').addEventListener('click', renderProvinceMap);
}

// ================== 新闻门户逻辑 ==================

// 普通填充新闻（首页默认展示）
const fillerArticles = {
  fire: {
    title: '云门县召开秋季森林防火会议',
    date: '2023年10月18日 09:26', section: '云门要闻', image: 'assets/news-fire-meeting.webp',
    caption: '会议现场，各乡镇及护林队负责人参加部署。　云门在线资料图',
    content: '本报讯　为切实做好秋冬季森林防火工作，云门县日前召开森林防火专项部署会议，各乡镇、林场及有关单位负责人参加会议。\n\n会议要求，各乡镇严格落实重点林区巡查值守制度，加强进山路口火源管控，并对独居老人、林区施工人员等重点群体开展入户宣传。县森林防灭火指挥部将组织督查组，不定期检查各地值班和物资储备情况。\n\n会议强调，当前天气持续干燥，森林火险等级较高，各单位要坚决克服麻痹思想，确保发现火情后第一时间报告、第一时间处置。',
    comments: [
      { user: 'shanlipiaoxiang', date: '2023-10-18 11:25', text: '每年这个时候山上确实容易起火，希望大家都注意点。' },
      { user: 'yunmenlaoli', date: '2023-10-18 14:10', text: '去年隔壁乡就烧了一小片，还是小心为上。' }
    ]
  },
  expo: {
    title: '云门县第三届农产品展销会圆满举行',
    date: '2023年5月11日 17:40', section: '民生新闻', image: 'assets/news-agri-expo.webp',
    caption: '县文化广场上的农产品展销区吸引了不少市民。　记者摄',
    content: '本报讯　云门县第三届农产品展销会日前在县文化广场圆满落幕。本届展销会共吸引县内外参展商120余家，集中展示苹果、核桃、蜂蜜、小杂粮等本地特色农产品。\n\n活动期间，主办方设置了产销对接、现场品鉴和农技咨询专区，不少乡镇合作社与外地采购商达成长期供货意向。据初步统计，展会现场及后续意向成交额突破300万元。\n\n县农业农村局有关负责人表示，今后将继续通过展销、电商培训等方式拓宽农产品销售渠道。',
    comments: [
      { user: 'laowangtou722', date: '2023-05-12 09:14', text: '今年苹果又大又甜，可惜没抢到那个福字馒头，明年得早点去。' },
      { user: 'yunmenchihuo', date: '2023-05-12 11:03', text: '现场人挤人，排队买烤肉排了小半个钟头，值了。' },
      { user: 'zhangsan', date: '2023-05-14 20:47', text: '头一回在咱这个网站注册账号，界面是有点老，不过用起来还行。以后没事就上来逛逛，对了展销会明年还是在文化广场办吗？' },
      { user: 'zhangdajiao', date: '2023-05-15 08:02', text: '楼上应该还是老地方吧，去年也是文化广场。' },
      { user: 'guoluyixia', date: '2023-05-15 10:30', text: '期待明年，希望能多几个卖蜂蜜的摊位。' }
    ]
  },
  bridge: {
    title: '云门大桥主体工程顺利合龙',
    date: '2023年3月18日 08:15', section: '重点工程', image: 'assets/news-yunmen-bridge.webp',
    caption: '云门大桥主桥合龙后的施工现场。　县融媒体中心供图',
    content: '本报讯　3月17日上午，随着最后一段梁体浇筑完成，云门大桥主体工程顺利合龙，标志着项目建设全面进入桥面铺装和附属设施施工阶段。\n\n云门大桥横跨清江河，全长860米，连接县城新旧两个片区。项目建成后，将有效分流老桥交通压力，缩短城南片区至客运站的通行时间。\n\n施工单位负责人介绍，目前桥面防水、照明和两侧连接线工程正同步推进，预计年底前具备通车条件。',
    comments: [
      { user: 'kaiche_laozhang', date: '2023-03-18 18:20', text: '终于合龙了，以后进城不用绕远路了。' },
      { user: 'yunmenbendiren', date: '2023-03-19 09:02', text: '希望通车以后限速能设得合理点，别老堵车。' },
      { user: 'guolu_amei', date: '2023-03-19 15:47', text: '桥修得挺好看的，晚上路灯也亮。' }
    ]
  },
  schoolfest: {
    title: '云门二中举行金秋读书节活动',
    date: '2023年9月25日 16:32', section: '教育在线', image: 'assets/news-school-reading.webp',
    caption: '学生在校园读书节开幕活动中进行诗歌朗诵。　校方供图',
    content: '本报讯　云门二中金秋读书节活动日前拉开帷幕，全校师生通过诗歌朗诵、读书分享会和班级图书角评比等形式，共同营造书香校园氛围。\n\n开幕活动上，学生代表分享了假期阅读心得，各年级还围绕地方历史、文学经典等主题进行了朗诵展示。学校图书室将在读书节期间延长开放时间。\n\n据介绍，本届读书节将持续一个月，优秀读书笔记和班级阅读成果将在校内集中展出。',
    comments: [
      { user: 'jiazhang_wang', date: '2023-09-25 20:11', text: '孩子回来说这次朗诵比赛挺有意思的，学校多办办这种活动挺好。' },
      { user: 'erzhong_xiaoxiao', date: '2023-09-26 07:40', text: '求问读书分享会的书单在哪里能看到？' }
    ]
  }
};

// 目标新闻（仅搜索关键词后才会出现，各自独立页面）
const targetArticles = {
  qiuCase: {
    title: '云门法院通报一起矿山领域案件审理结果',
    date: '2023年6月18日 10:42', section: '法治云门', image: 'assets/news-qiu-mancang-case.webp',
    caption: '案件审理期间的法院外景。　云门在线资料图',
    content: '本报讯　岱州市中级人民法院近日通报一起矿山经营相关案件审理结果。被告人邱满仓曾长期组织工人在云门县及周边多处矿山从事采掘作业，法院依法对其作出终审裁判，决定执行有期徒刑十三年。\n\n通报未列明具体罪名，也未披露涉事企业、相关事件及人员信息。记者从公开页面看到，部分案情仍以“涉及关联事项”为由省略，裁判文书全文未随通报发布。\n\n据悉，邱满仓其后于服刑期间因病去世。有关情况以相关部门后续发布为准。',
    tags: ['恒源铁矿', '工头', '邱满仓', '法院', '矿山案件'],
    evidenceName: '工头身份·法律简讯',
    evidenceDesc: '本地法治简讯披露，长期活跃于各矿山的大工头名叫邱满仓，已因刑事案件服刑，且已在狱中病逝。',
    evidenceQuery: '恒源铁矿 工头'
  },
  rectify: {
    title: '云门县部署铁矿行业安全生产专项整治工作',
    date: '2022年6月16日 10:08', section: '政务动态', image: 'assets/news-mine-rectification.webp',
    caption: '联合检查组在一处铁矿洞口检查停产措施落实情况。　资料图',
    content: '本报讯　为深刻汲取此前一起透水事故教训，该事故造成13名工人遇难，云门县政府决定即日起对全县范围内铁矿企业实施停产停建整顿。\n\n整治期间，各矿山企业须封存生产设备、暂停井下作业，对通风、排水、支护和人员管理制度开展全面自查。未完成隐患整改、未经联合验收的企业，一律不得擅自恢复生产。\n\n县安全生产委员会将组建联合检查组，对各矿区设备封存、洞口管控及值守情况进行现场核查，并向社会公布举报电话。',
    tags: ['铁矿', '恒源铁矿', '恒源矿业', '停产整顿']
  },
  hengyuan: {
    title: '恒源铁矿完成停产整顿阶段性验收',
    date: '2022年11月18日 18:05', section: '政务动态', image: 'assets/news-hengyuan-inspection.webp',
    caption: '检查人员查看恒源铁矿洞口封堵及设备封存情况。　资料图',
    content: '本报讯　日前，经县安全生产委员会现场核查，恒源矿业有限责任公司已按要求完成机械设备封存、洞口封堵等阶段性整改措施，进入下阶段复查程序。\n\n检查组现场查看了矿区主要洞口、机械设备和安全台账，并要求企业继续做好停产期间值班巡查，严禁未经批准擅自组织生产。\n\n企业相关负责人表示，公司将持续配合监管部门做好后续工作，并根据复查意见完善有关安全管理制度。',
    tags: ['铁矿', '恒源铁矿', '恒源矿业', '恒源', '停产整顿', '验收'],
    foldedComment: { user: 'guanjiangren', date: '2022-11-18 23:51', text: '2022年死的那三个人是咋死的，矿上心里没数吗' }
  }
};

function renderPortalList(filter) {
  const list = document.getElementById('portal-list');
  const detail = document.getElementById('portal-detail');
  const homeContent = document.getElementById('portal-home-content');
  const banner = document.getElementById('portal-banner');
  detail.classList.add('hidden');
  homeContent.classList.remove('hidden');
  list.classList.remove('hidden');

  filter = (filter || '').trim();
  banner.classList.toggle('hidden', !!filter);

  const fillerKeys = Object.keys(fillerArticles).filter(k =>
    !filter || fillerArticles[k].title.includes(filter)
  );
  const targetKeys = filter
    ? Object.keys(targetArticles).filter(k => {
        // 邱满仓的法治简讯属于“工头身份”线索，不能被宽泛的矿名搜索提前剧透。
        if (k === 'qiuCase') {
          return filter.includes('恒源铁矿') && filter.includes('工头');
        }
        return targetArticles[k].tags.some(t => t.includes(filter) || filter.includes(t));
      })
    : [];

  if (filter && fillerKeys.length === 0 && targetKeys.length === 0) {
    list.innerHTML = '<div class="no-result" style="padding:20px 0;">未找到相关新闻。</div>';
    return;
  }

  const renderItem = (k, a, isTarget) => {
    const excerpt = a.content.replace(/\n+/g, '').slice(0, 76) + '……';
    return `
      <article class="portal-item" data-key="${k}" data-target="${isTarget ? '1' : '0'}">
        <img class="portal-thumb" src="${a.image}" alt="${a.title}新闻配图">
        <div class="portal-item-copy">
          ${isTarget ? '<span class="search-tag">站内搜索结果</span>' : ''}
          <div class="p-section">${a.section}</div>
          <div class="p-title">${a.title}</div>
          <div class="p-date">${a.date}　来源：云门在线</div>
          <div class="p-excerpt">${excerpt}</div>
        </div>
      </article>
    `;
  };

  list.innerHTML =
    targetKeys.map(k => renderItem(k, targetArticles[k], true)).join('') +
    fillerKeys.map(k => renderItem(k, fillerArticles[k], false)).join('');

  list.querySelectorAll('.portal-item').forEach(item => {
    item.addEventListener('click', () => {
      openPortalArticle(item.dataset.key, item.dataset.target === '1');
    });
  });
  document.getElementById('portal-body').scrollTop = 0;
}

function renderComments(a) {
  if (a.comments && a.comments.length) {
    return `
      <div class="comment-section">
        <div class="c-title">评论（${a.comments.length}）</div>
        ${a.comments.map(c => `
          <div class="comment-item">
            <div class="cm-head">${c.user}<span class="cm-date">${c.date}</span></div>
            <div class="cm-text">${c.text}</div>
          </div>
        `).join('')}
      </div>
    `;
  }
  if (a.foldedComment) {
    if (state.hiddenCommentFound) {
      const c = a.foldedComment;
      return `
        <div class="comment-section">
          <div class="c-title">评论（1）</div>
          <div class="comment-item revealed">
            <div class="cm-head">${c.user}<span class="cm-date">${c.date}</span></div>
            <div class="cm-text">${c.text}</div>
          </div>
        </div>
      `;
    }
    return `
      <div class="comment-section">
        <div class="c-title">评论（1）</div>
        <div class="comment-folded">
          <span>💬 有1条评论因被举报，已折叠。</span>
          <span class="login-link" id="portal-login-link">登录后查看</span>
        </div>
      </div>
    `;
  }
  return `
    <div class="comment-section">
      <div class="c-title">评论（0）</div>
      <div class="comment-empty">暂无评论</div>
    </div>
  `;
}

function openPortalArticle(key, isTarget) {
  const a = isTarget ? targetArticles[key] : fillerArticles[key];
  const homeContent = document.getElementById('portal-home-content');
  const detail = document.getElementById('portal-detail');
  homeContent.classList.add('hidden');
  detail.classList.remove('hidden');

  if (isTarget) {
    if (a.evidenceName) {
      addEvidence(a.evidenceName, a.evidenceDesc, () => jumpToSearch(a.evidenceQuery));
    } else {
      addEvidence('新闻《' + a.title + '》', '云门在线报道，' + a.date + '。', () => jumpToPortalArticle(key));
    }
  }

  const paragraphs = a.content.split(/\n\n+/).map(p => `<p>${p}</p>`).join('');
  const html = `
    <div class="portal-article-toolbar"><span class="portal-back" id="portal-back">网站首页</span>　&gt;　${a.section}　&gt;　正文</div>
    <article class="portal-article">
      <div class="article-section">${a.section}</div>
      <h1>${a.title}</h1>
      <div class="p-meta">发布时间：${a.date}　　来源：云门在线　　责任编辑：李闻</div>
      <img class="portal-article-image" src="${a.image}" alt="${a.title}">
      <div class="portal-image-caption">${a.caption}</div>
      <div class="p-content">${paragraphs}</div>
      ${renderComments(a)}
    </article>
  `;

  detail.innerHTML = html;
  document.getElementById('portal-body').scrollTop = 0;
  document.getElementById('portal-back').addEventListener('click', () => renderPortalList());

  const loginLink = document.getElementById('portal-login-link');
  if (loginLink) {
    loginLink.addEventListener('click', () => openLoginModal(key));
  }
}

// ================== 独立网页：法院官网 / 正阳镇吧 ==================
function openStandalonePage(page) {
  const body = document.getElementById('standalone-web-body');
  const title = document.getElementById('webpage-window-title');
  switchApp('app-webpage');

  if (page === 'court') {
    title.textContent = '岱州市中级人民法院 · 审判公开';
    body.innerHTML = `
      <div class="court-site">
        <header class="court-masthead">
          <div class="court-emblem">法</div>
          <div><h1>岱州市中级人民法院</h1><span>DAIZHOU INTERMEDIATE PEOPLE'S COURT</span></div>
        </header>
        <nav class="court-nav"><span>首页</span><span>法院概况</span><span>新闻中心</span><span class="active">审判公开</span><span>裁判文书</span><span>诉讼服务</span></nav>
        <div class="court-content">
          <button class="web-back" id="standalone-back">← 返回搜索结果</button>
          <div class="court-breadcrumb">首页 &gt; 审判公开 &gt; 公开宣判信息</div>
          <article class="court-article">
            <div class="court-label">公开宣判</div>
            <h2>被告人邱满仓案公开宣判信息</h2>
            <div class="court-meta">发布时间：2023-06-16　来源：岱州市中级人民法院</div>
            <img src="assets/court-qiu-mancang.webp" alt="岱州市中级人民法院审判庭">
            <p>近日，岱州市中级人民法院依法对被告人邱满仓所涉矿山经营相关案件作出终审裁判。</p>
            <p>根据已经生效的裁判结果，决定对邱满仓执行有期徒刑十三年。</p>
            <p>因案件涉及多项关联事项，本页面不列明具体罪名、涉事企业及案情细节，裁判文书全文未予公开。</p>
          </article>
        </div>
        <footer class="court-footer">岱州市中级人民法院版权所有　|　网站信息仅供查询</footer>
      </div>`;
    if (!state.ch3.judgmentEmailSent) {
      state.ch3.judgmentEmailSent = true;
      setTimeout(sendJudgmentEmail, 650);
    }
  } else {
    title.textContent = '正阳镇吧 · 云门地方论坛';
    body.innerHTML = `
      <div class="forum-site">
        <header class="forum-head"><div class="forum-logo">云门<span>贴吧</span></div><div class="forum-search">搜吧内帖子　　🔍</div></header>
        <nav class="forum-nav">云门论坛　&gt;　江源县　&gt;　<strong>正阳镇吧</strong></nav>
        <div class="forum-wrap">
          <button class="web-back forum-back" id="standalone-back">← 返回搜索结果</button>
          <div class="forum-bar"><strong>正阳镇吧</strong><span>关注：1,284　帖子：6,907</span></div>
          <h2 class="forum-title"><span>主题：</span>说说邱满仓下葬的事</h2>
          <div class="forum-post">
            <aside class="forum-user"><div class="forum-avatar">山</div><strong>山里旧事</strong><small>本吧活跃用户</small></aside>
            <article class="forum-copy">
              <p>听说邱满仓老家是正阳镇的，前阵子刚下葬。那天来送葬的老乡不少，好几个都是当年跟着他去矿上干活的。</p>
              <p>人走了，旧事就更没人愿意提了。镇上岁数大点的应该都知道邱家老宅在哪。</p>
              <img src="assets/forum-qiu-mancang-funeral.webp" alt="正阳镇一处葬礼散场后的老院子">
              <div class="forum-photo-note">楼主手机拍摄 · 葬礼散场后</div>
              <div class="forum-floor">1楼　2023-06-20 21:37</div>
            </article>
          </div>
          <div class="forum-post reply">
            <aside class="forum-user"><div class="forum-avatar alt">正</div><strong>正阳老街</strong><small>吧龄 7 年</small></aside>
            <article class="forum-copy"><p>就是镇北边那条旧路进去，靠山脚的院子。当天确实来了不少外乡人。</p><div class="forum-floor">2楼　2023-06-21 08:12</div></article>
          </div>
          <div class="forum-post reply">
            <aside class="forum-user"><div class="forum-avatar muted">路</div><strong>路过不多说</strong><small>吧龄 3 年</small></aside>
            <article class="forum-copy"><p>矿上的事别在网上乱讲，小心给自己找麻烦。</p><div class="forum-floor">3楼　2023-06-21 09:06</div></article>
          </div>
        </div>
        <footer class="forum-footer">© 2009-2023 云门地方论坛　网络信息服务备案</footer>
      </div>`;
    if (!state.ch3.hometownUnlocked) {
      state.ch3.hometownUnlocked = true;
      renderProvinceMap();
      setTimeout(() => toast('地图已更新：江源县新增地点——正阳镇。'), 500);
    }
  }

  body.scrollTop = 0;
  document.getElementById('standalone-back').addEventListener('click', () => switchApp('app-search'));
}

document.getElementById('portal-search-btn').addEventListener('click', () => {
  const q = document.getElementById('portal-search-input').value.trim();
  renderPortalList(q);
});
document.getElementById('portal-search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    renderPortalList(document.getElementById('portal-search-input').value.trim());
  }
});

function goPortalHome() {
  document.getElementById('portal-search-input').value = '';
  renderPortalList();
  document.getElementById('portal-body').scrollTop = 0;
}
document.getElementById('portal-nav-home').addEventListener('click', goPortalHome);
document.getElementById('portal-title-home').addEventListener('click', goPortalHome);
document.getElementById('portal-brand-home').addEventListener('click', goPortalHome);

// ================== 论坛登录 ==================
function openLoginModal(articleKey) {
  const modal = document.getElementById('login-modal');
  modal.classList.remove('hidden');
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').classList.add('hidden');

  const submit = document.getElementById('login-submit');
  submit.onclick = () => {
    const u = document.getElementById('login-username').value.trim().toLowerCase();
    const p = document.getElementById('login-password').value.trim();
    if (u === 'zhangsan' && p === '20230514') {
      modal.classList.add('hidden');
      if (!state.hiddenCommentFound) {
        state.hiddenCommentFound = true;
        addEvidence(
          '匿名网友评论残影',
          '用账号 zhangsan 登录云门在线后，在《恒源铁矿完成停产整顿阶段性验收》评论区看到一条被折叠的评论："2022年死的那三个人是咋死的，矿上心里没数吗"。这与匿名名单中2022年的三条死亡记录吻合。',
          jumpToHiddenComment
        );
      }
      openPortalArticle(articleKey, true);
    } else {
      document.getElementById('login-error').classList.remove('hidden');
    }
  };
}
document.getElementById('login-close').addEventListener('click', () => {
  document.getElementById('login-modal').classList.add('hidden');
});

// ================== 对话弹窗（通用） ==================
let dialogueTypingTimer = null;

function parseDialogueBeats(text) {
  const beats = [];
  String(text).split(/\n+/).map(line => line.trim()).filter(Boolean).forEach(line => {
    const match = line.match(/^([^：]{1,24})：(?:["“])?(.*?)(?:["”])?$/);
    const speaker = match ? match[1] : '叙述';
    const content = match ? match[2] : line;
    const sentences = content.match(/[^。！？!?]+[。！？!?]+["”]?|[^。！？!?]+$/g) || [content];
    sentences.map(s => s.trim()).filter(Boolean).forEach(sentence => beats.push({ speaker, text: sentence }));
  });
  return beats.length ? beats : [{ speaker: '叙述', text: '' }];
}

function showDialogue(text, onClose, scene = null) {
  const beats = parseDialogueBeats(text);
  const modal = document.getElementById('dialogue-modal');
  const box = modal.querySelector('.dialogue-box');
  const stageBg = document.getElementById('dialogue-stage-bg');
  const characterEl = document.getElementById('dialogue-character');
  const speakerEl = document.getElementById('dialogue-speaker');
  const textEl = document.getElementById('dialogue-text');
  const progressEl = document.getElementById('dialogue-progress');
  const nextBtn = document.getElementById('dialogue-next');
  let index = 0;
  let typing = false;
  let finished = false;

  clearInterval(dialogueTypingTimer);
  const visualNovelMode = !!(scene && scene.background);
  modal.classList.toggle('vn-mode', visualNovelMode);
  box.classList.toggle('vn-dialogue-box', visualNovelMode);
  box.classList.toggle('calendar-scene', visualNovelMode && !!scene.calendarInPhoto);
  stageBg.style.backgroundImage = visualNovelMode ? `url('${scene.background}')` : '';
  characterEl.style.backgroundImage = visualNovelMode && scene.portrait ? `url('${scene.portrait}')` : '';
  characterEl.classList.toggle('hidden', !visualNovelMode || !scene.portrait);
  characterEl.classList.toggle('soft-vignette', visualNovelMode && !!scene.softPortrait);
  modal.classList.remove('hidden');

  const close = () => {
    if (finished) return;
    finished = true;
    clearInterval(dialogueTypingTimer);
    modal.classList.add('hidden');
    if (onClose) onClose();
  };

  const renderBeat = () => {
    const beat = beats[index];
    clearInterval(dialogueTypingTimer);
    typing = true;
    speakerEl.textContent = beat.speaker;
    speakerEl.classList.toggle('narrator', beat.speaker === '叙述');
    characterEl.classList.toggle('listening', beat.speaker === '你' || beat.speaker === '叙述');
    textEl.textContent = '';
    progressEl.textContent = `${index + 1} / ${beats.length}`;
    nextBtn.textContent = index === beats.length - 1 ? '结束' : '继续 →';
    box.classList.remove('beat-enter');
    void box.offsetWidth;
    box.classList.add('beat-enter');
    let charIndex = 0;
    dialogueTypingTimer = setInterval(() => {
      charIndex += 1;
      textEl.textContent = beat.text.slice(0, charIndex);
      if (charIndex >= beat.text.length) {
        clearInterval(dialogueTypingTimer);
        typing = false;
      }
    }, 24);
  };

  const advance = () => {
    if (typing) {
      clearInterval(dialogueTypingTimer);
      textEl.textContent = beats[index].text;
      typing = false;
      return;
    }
    if (index >= beats.length - 1) {
      close();
      return;
    }
    index += 1;
    renderBeat();
  };

  nextBtn.onclick = advance;
  textEl.onclick = advance;
  document.getElementById('dialogue-close').onclick = close;
  renderBeat();
}

// ================== 编辑来信（教学关失败后触发） ==================
// 动态给收件箱插入一封新邮件（编辑来信、加密附件等章节触发的邮件都走这个）
function addDynamicMail(id, mailObj, { silent = false } = {}) {
  mailData[id] = mailObj;
  const mailList = document.getElementById('mail-list');
  if (mailList.querySelector(`[data-mail="${id}"]`)) return;
  const div = document.createElement('div');
  div.className = `mail-item ${state.mailRead.includes(id) ? 'read' : 'unread'}`;
  div.dataset.mail = id;
  const initial = mailObj.from.includes('陈明轩') ? '陈' : mailObj.from.slice(0, 1);
  const preview = mailObj.body.replace(/\s+/g, ' ').slice(0, 34) + '……';
  div.innerHTML = `
    <div class="mail-avatar editor">${initial}</div>
    <div class="mail-summary"><div class="mail-row"><div class="mail-from">${mailObj.from}</div><div class="mail-time">${mailObj.time}</div></div>
    <div class="mail-subject">${mailObj.subject}${mailObj.attachment ? ' <span class="attachment-mark">⌕</span>' : ''}</div><div class="mail-preview">${preview}</div></div>
  `;
  div.addEventListener('click', () => {
    document.querySelectorAll('.mail-item').forEach(i => i.classList.remove('selected'));
    div.classList.add('selected');
    markMailRead(id, div);
    renderMailDetail(id);
  });
  mailList.prepend(div);
  updateMailUnreadCount();
  if (!silent) toast('收件箱里有一封新邮件。');
}

function sendEditorEmail(options) {
  addDynamicMail('editorTip', {
    from: '编辑部 · 陈明轩', subject: '进展如何？', time: '刚刚',
    body: '沈老师：\n\n听说在村里碰壁了？矿上这种事，家属大多怕惹麻烦，你要是一上来就说是记者，人家肯定不敢跟你说实话，甚至直接把你当成来找茬的。\n\n换个说法试试：就说是"了解赔偿处理方式的法律工作者"，看看效果会不会不一样。有些家属心里其实也有委屈想说，只是需要一个由头。\n\n注意安全。\n\n陈明轩'
  }, options);
}

function sendJudgmentEmail(options) {
  addDynamicMail('judgmentDoc', {
    from: '编辑部 · 陈明轩', subject: '判决书全文，注意查收', time: '刚刚',
    body: '沈老师：\n\n网上能查到的只有判决结果，详细案情法院没公开。托一个做律师的朋友帮忙找了份完整版，他们内部对这种没正式公开的文书控制得严，加了密码，也是怕万一传出去追查到他。\n\n密码你自己想办法猜一下——镇上人都熟悉的恒源铁矿开采的那种结构，对应的英文单词。\n\n陈明轩',
    attachment: true,
    attachmentName: '邱满仓案二审判决书（全文）.pdf',
    attachmentLocked: true,
    attachmentHandler: openJudgmentPasswordModal
  }, options);
}

// ================== 判决书密码与全文 ==================
function openJudgmentPasswordModal() {
  const modal = document.getElementById('judgment-modal');
  modal.classList.remove('hidden');
  document.getElementById('judgment-password').value = '';
  document.getElementById('judgment-error').classList.add('hidden');

  document.getElementById('judgment-submit').onclick = () => {
    const val = document.getElementById('judgment-password').value.trim().toLowerCase();
    if (val === 'adit') {
      modal.classList.add('hidden');
      openJudgmentDocument();
    } else {
      document.getElementById('judgment-error').classList.remove('hidden');
    }
  };
}
document.getElementById('judgment-close').addEventListener('click', () => {
  document.getElementById('judgment-modal').classList.add('hidden');
});

function jumpToJudgment() {
  switchApp('app-mail');
  openJudgmentDocument();
}

function openJudgmentDocument() {
  const modal = document.getElementById('doc-modal');
  modal.classList.remove('hidden');
  const page = document.getElementById('doc-modal-body');
  page.className = 'pdf-page judgment-page';
  page.innerHTML = `
    <div class="pdf-title">岱州市中级人民法院 刑事判决书</div>
    <div class="pdf-subtitle">（2022）岱刑终118号</div>
    <div class="protocol-text" style="white-space:pre-wrap;">一、2007年7月10日、2012年4月21日，被告人邱满仓分别在其承包的恒源铁矿矿洞内，因落石事故致矿工何长顺、白玉山死亡，邱满仓未依法向有关部门报告，而是伙同他人对上述二人死亡事故予以隐瞒，并私自与死者家属协商，支付赔偿款后了结。

二、2013年7月，邱满仓承包的双龙铁矿二采区因连续降雨发生山体滑坡，致4名矿工被困洞中。邱满仓获悉后，未向政府有关部门报告，而是组织人员自行施救，并在事故发生后向赶至现场的救援指挥部隐瞒真实情况，谎称"只有1人死亡"。后因一名遇难矿工家属报警，真相曝光，经抢险，4名矿工均已遇难，家属分别获赔140万至230万元不等。

关于赔偿责任分担，邱满仓辩称：其与矿方签订的承包协议约定，发生死亡事故后，2015年之前由矿方承担百分之四十、其承担百分之六十的赔偿责任；2015年之后，矿方不再承担赔偿责任，仅在每吨矿石采矿费用中加收1元作为补偿，工伤及矿难均由其自行处理。

原审被告人、恒源矿业法定代表人陆长仁则证称：其与邱满仓之间从未就工伤、矿难赔偿责任比例达成过口头或书面协议；公司仅以"安全风险抵押金"名义，每吨矿石扣除邱满仓采矿费用1元，若当年未发生工伤或矿难，该笔资金于年底如数返还，"自邱满仓承包我公司采矿业务以来，从未向公司报告过工伤事故或矿难，因此每年公司都按约定将安全风险抵押金返还给了他。"

本院认为，上诉人邱满仓身为矿山承包人，明知安全生产事故发生后应当及时如实报告，却为逃避责任、减少经济损失，采取隐瞒、谎报等手段，致使相关部门未能及时掌握事故真实情况，其行为已构成不报、谎报安全事故罪；其在承包经营期间，为免于监管处罚，多次向他人行贿，其行为又构成行贿罪，数罪并罚，决定执行有期徒刑十三年。</div>
    <button class="login-submit" id="judgment-confirm-btn">整理进证据夹</button>
  `;
  document.getElementById('judgment-confirm-btn').onclick = () => {
    modal.classList.add('hidden');
    addEvidence(
      '邱满仓刑事判决书全文',
      '披露三起瞒报事件：2007年何长顺、2012年白玉山（恒源铁矿，与第二章枣岭乡走访核实信息完全吻合）、2013年双龙铁矿4人被困谎报1人死亡。邱满仓因不报谎报安全事故罪、行贿罪数罪并罚，获刑十三年。',
      jumpToJudgment
    );
    addEvidence(
      '责任分歧·矿主证言矛盾',
      '邱满仓称与矿方有赔偿分摊协议，矿主陆长仁矢口否认，声称从未收到任何工伤矿难报告。双方证词直接矛盾，责任归属存疑，恒源矿业是否知情、是否间接纵容瞒报，仍需进一步追查。',
      jumpToJudgment
    );
  };
}

// ================== 第四章：恒源矿业工商信息 ==================
function openRegistryDocument() {
  switchApp('app-webpage');
  document.getElementById('webpage-window-title').textContent = '企业信用信息公示 · 恒源矿业有限责任公司';
  const body = document.getElementById('standalone-web-body');
  body.innerHTML = `
    <div class="registry-site">
      <header class="registry-head">
        <div class="registry-seal">企</div>
        <div><h1>企业信用信息公示系统</h1><span>岱州市市场主体信息查询平台</span></div>
      </header>
      <nav class="registry-nav"><span>首页</span><span>企业信息填报</span><span class="active">信息公示</span><span>经营异常名录</span><span>严重违法失信名单</span></nav>
      <main class="registry-wrap">
        <button class="web-back" id="registry-back">← 返回搜索结果</button>
        <div class="registry-searchbar"><span>企业名称 / 统一社会信用代码</span><strong>恒源矿业有限责任公司</strong><button>查询</button></div>
        <section class="registry-company-card">
          <div class="registry-company-title">
            <div><span class="registry-company-icon">恒</span><div><h2>恒源矿业有限责任公司</h2><small>统一社会信用代码：91140921MA0XXXXX0X</small></div></div>
            <b>存续</b>
          </div>
          <div class="registry-section-title">基础信息</div>
          <div class="registry-facts">
            <div><span>法定代表人</span><strong>陆长仁</strong></div>
            <div><span>成立日期</span><strong>2004年6月</strong></div>
            <div><span>注册资本</span><strong>人民币800万元</strong></div>
            <div><span>登记机关</span><strong>云门县市场监督管理局</strong></div>
            <div class="wide"><span>住所</span><strong>岱州市云门县初一沟村马鬃山采矿区</strong></div>
            <div class="phone-clue"><span>联系电话</span><strong>0350-XXXXXXX</strong><em>可核实</em></div>
          </div>
          <div class="registry-section-title">股东及出资变更记录</div>
          <div class="registry-timeline">
            <div><time>2004.06</time><i></i><section><strong>设立登记</strong><p>陆长仁 65%　陆长贵 20%　贺瑞莲 15%</p></section></div>
            <div class="suspicious"><time>2021.03</time><i></i><section><strong>股东变更</strong><p>原三名股东退出；云岭矿业投资有限公司新增持股 <b>53.5%</b>。</p></section></div>
            <div class="suspicious"><time>2021.07</time><i></i><section><strong>股东再次变更</strong><p>云岭矿业投资有限公司退出；杨学东新增持股 <b>53.5%</b>。</p></section></div>
          </div>
          <div class="registry-warning">两次大比例股权变更均发生在邱满仓案第一次开庭审理期间。</div>
          <button class="registry-collect" id="registry-confirm-btn">整理关键信息并保存到证据夹</button>
        </section>
        <div class="registry-footnote">信息来源：市场主体登记公示数据　查询时间：2023年10月23日</div>
      </main>
    </div>`;
  body.scrollTop = 0;
  document.getElementById('registry-back').onclick = () => switchApp('app-search');
  document.getElementById('registry-confirm-btn').onclick = () => {
    addEvidence(
      '恒源矿业股东变更记录',
      '公示信息显示，2021年恒源矿业股东两度变更，一家名为"云岭矿业投资有限公司"的公司曾短暂持股53.5%后迅速退出。',
      openRegistryDocument
    );
    addEvidence(
      '股权变更疑点',
      '恒源矿业股东在2021年3月至7月间两次变更，占股53.5%的大股东走马灯式更替，而这段时间正是邱满仓案第一次开庭审理期间。陆长仁虽一度登记退股，最终仍以法定代表人身份重新出现，实际控制权始终未变。反复腾挪股权结构的操作，与邱满仓案审理节点高度重合，不排除是刻意切割责任、规避追责风险的安排。',
      openRegistryDocument
    );
    if (!state.ch2.unlockedPhones.includes('hengyuanOffice')) {
      state.ch2.unlockedPhones.push('hengyuanOffice');
      unlockDock('app-contacts');
      renderContacts();
    }
    renderEvidence();
    switchApp('app-evidence');
    toast('已整理到证据夹；通讯录新增联系人：恒源矿业办公室。', 4200);
  };
}

// ================== 终章 / 后记 ==================
function showEnding() {
  const overlay = document.getElementById('ending-overlay');
  overlay.classList.remove('hidden');
  document.getElementById('ending-content').innerHTML = `
    <div class="ending-page report-page">
      <header class="ending-masthead"><span>方圆周刊 · 调查部</span><time>2023年10月24日</time></header>
      <div class="ending-status"><i></i> 报道已刊发</div>
      <section class="ending-lede">
        <small>深度调查 · 特别报道</small>
        <h1>云门矿难沉默录</h1>
        <p>恒源铁矿死亡瞒报调查</p>
        <div class="ending-byline">记者　沈知行　｜　责任编辑　陈明轩</div>
      </section>
      <section class="ending-result">
        <div class="ending-result-label">一个月后 · 联合调查组通报</div>
        <div class="ending-stats">
          <div><strong>29</strong><span>起瞒报事故</span></div>
          <div><strong>35</strong><span>名矿工死亡</span></div>
          <div><strong>21</strong><span>人被采取刑事强制措施</span></div>
        </div>
        <p>举报名单最初提供的14名矿工信息全部查实。官方调查最终确认的死亡人数，比名单多出21人。</p>
      </section>
      <div class="ending-closing">你合上电脑。十四个曾经只是举报材料中模糊字迹的名字，终于进入了公开记录。</div>
      <div class="ending-fin">全剧终</div>
      <button class="ending-next" id="ending-epilogue-btn">继续阅读 · 关于本作　→</button>
    </div>
  `;
  document.getElementById('ending-epilogue-btn').onclick = renderEpilogue;
}

const publicationCallText =
    '叙述：晚上十一点十七分，手机突然震了起来。屏幕上是陈明轩。\n' +
    '陈明轩（电话中）："选题预告发出去以后，当地已经开始联系编辑部了。先是打听你查到了什么，后来话说得越来越重。"\n' +
    '你："他们要求撤稿？"\n' +
    '陈明轩（电话中）："没明说，但意思很清楚。他们知道我们在查，也知道稿子快发了。再按原计划等一天，谁也不知道会出什么岔子。"\n' +
    '你："事实核验和法务审读都已经完成，恒源那边也给足了回应时间。"\n' +
    '陈明轩（电话中）："好。把稿子发了吧，提前一天。省得夜长梦多。"\n' +
    '叙述：电话挂断。几秒后，编辑部工作群里跳出一条新消息：稿件进入发布流程。';

function showPublicationCall() {
  showDialogue(publicationCallText, () => {
    state.finale.publicationCallCompleted = true;
    if (!state.ch2.unlockedPhones.includes('chenMingxuan')) {
      state.ch2.unlockedPhones.push('chenMingxuan');
    }
    state.ch2.visited.chenMingxuan = 'phone';
    unlockDock('app-contacts');
    renderContacts();
    saveLocalProgress();
    showEnding();
  }, {
    background: 'assets/editor-night-office.webp',
    portrait: 'assets/chen-mingxuan-character.webp',
    softPortrait: true,
    calendar: false
  });
}

function renderEpilogue() {
  document.getElementById('ending-content').innerHTML = `
    <div class="ending-page epilogue-page">
      <header class="ending-masthead"><span>制作手记</span><time>ABOUT THIS STORY</time></header>
      <div class="epilogue-eyebrow">尾声</div>
      <h1 class="epilogue-title">关于本作</h1>
      <section class="epilogue-block">
        <h2>虚构故事，真实原型</h2>
        <p>本作剧情、人物、地名均为虚构改编，原型取材自《中国新闻周刊》记者刘向南2023年6月发表的调查报道《山西代县矿工死亡瞒报事件调查》。游戏中的云门县、恒源铁矿、邱满仓、陆长仁等人名地名均为虚构，如有雷同，纯属巧合。</p>
      </section>
      <section class="epilogue-block">
        <h2>真实世界里的后续</h2>
        <p>报道刊发一个月后，2023年7月30日，山西省联合调查组发布通报：走访遇难矿工家属、工友等200余人次，调取企业资料四万余页，最终查实涉事矿企瞒报生产安全事故40起、矿工死亡43人。公安机关对28名涉案人员采取刑事强制措施。</p>
      </section>
      <section class="epilogue-block tribute-block">
        <h2>致敬调查记者</h2>
        <p>真实世界里，没有“记者笔记”替你自动核对信息，也没有系统提示告诉你证据是否集齐。每一条线索，都是一次次登门、一次次碰壁之后，依然选择再试一次换来的。</p>
        <p>认真核实的每一件小事，加在一起，能让一些原本注定沉默的名字，被人重新记住。</p>
        <strong>谨以此作品，致敬所有仍在路上的调查记者。</strong>
      </section>
      <button class="ending-next secondary" id="ending-close-btn">返回调查桌面</button>
    </div>`;
  document.querySelector('.ending-box').scrollTop = 0;
  document.getElementById('ending-close-btn').onclick = () => document.getElementById('ending-overlay').classList.add('hidden');
}

// ================== 村庄走访 ==================
function forcedFailText(contact) {
  return `你："您好，我们是《方圆周刊》的记者，想了解一下${contact.victim}的情况。"\n${contact.name}（脸色立刻变了）："记者？谁让你们来的？我们家的事，不需要外人管！"\n\n${contact.name}转身进了屋，门"哐"地关上了。`;
}

function contactDialogueScene(contact) {
  return {
    background: contact.image,
    portrait: contact.portrait,
    calendarInPhoto: contact.special === 'comboLock'
  };
}

function neighborDialogueScene(village) {
  return {
    background: village.entranceImage || (village.contacts[0] && village.contacts[0].image),
    portrait: village.neighbor && village.neighbor.portrait,
    calendar: false
  };
}

async function enterVillage(key) {
  if (villageTransitioning) return;
  villageTransitioning = true;
  const v = villages[key];
  const loadingToast = setTimeout(() => toast(`正在前往${v.name}……`, 1400), 180);
  await preloadVillageScene(key);
  clearTimeout(loadingToast);
  state.ch2.currentHome = null;
  switchApp('app-village');
  renderVillage(key);
  saveLocalProgress();
  villageTransitioning = false;
  if (v.neighbor && !state.ch2.neighborVisited[key]) {
    requestAnimationFrame(() => talkToNeighbor(key));
  } else if (!v.neighbor && v.contacts.length === 1 && !state.ch2.visited[v.contacts[0].id]) {
    requestAnimationFrame(() => handleNpcCardClick(key, v.contacts[0].id, 'contact'));
  }
}

function renderVillage(key) {
  state.ch2.currentVillage = key;
  const v = villages[key];
  document.getElementById('village-title').textContent = v.name;
  const body = document.getElementById('village-body');

  const unlockedIds = key === 'zhengyang' ? v.contacts.map(c => c.id) : getUnlockedContacts(key);
  const firstVisibleHome = v.contacts.find(c => unlockedIds.includes(c.id) && c.image);
  const sceneImage = v.entranceImage || (firstVisibleHome && firstVisibleHome.image) || 'assets/regional-map.webp';

  let actions = '';
  if (v.neighbor) {
    actions += `<button class="scene-destination neighbor-destination" data-id="${v.neighbor.id}" data-type="neighbor">
      <span class="destination-icon">👤</span>
      <span><strong>${v.neighbor.name}</strong><small>${state.ch2.neighborVisited[key] ? '再次询问' : '正在交谈'}</small></span>
    </button>`;
  }

  v.contacts.forEach(c => {
    const unlocked = unlockedIds.includes(c.id);
    if (!unlocked) return;
    const st = state.ch2.visited[c.id];
    let statusText = '前往家中';
    let disabled = false;
    if (st === 'success') statusText = '再次查看';
    else if (st === 'burned') {
      const phoneDone = c.phone && state.ch2.visited[c.phone.id] === 'phone';
      statusText = phoneDone ? '已通过电话核实' : '已经闭门';
      disabled = true;
    }
    actions += `<button class="scene-destination home-destination ${disabled ? 'disabled' : ''}" data-id="${c.id}" data-type="contact" ${disabled ? 'disabled' : ''}>
      <span class="destination-icon">⌂</span>
      <span><strong>${c.name}家</strong><small>${statusText}</small></span>
    </button>`;
  });

  const waitingHint = v.neighbor && unlockedIds.length === 0
    ? '<div class="scene-waiting">先听当地人把话说完，才能知道该往哪户人家走。</div>'
    : '';
  body.innerHTML = `
    <div class="village-stage" style="background-image:url('${sceneImage}')">
      <div class="village-stage-shade"></div>
      <button class="village-stage-back" id="village-back">← 返回驾车路线</button>
      ${waitingHint}
      <div class="scene-destinations">${actions}</div>
    </div>
  `;

  document.getElementById('village-back').addEventListener('click', () => {
    switchApp('app-map');
    renderTownships();
  });

  body.querySelectorAll('.scene-destination').forEach(card => {
    card.addEventListener('click', () => {
      if (card.disabled) return;
      handleNpcCardClick(key, card.dataset.id, card.dataset.type);
    });
  });
}

function handleNpcCardClick(villageKey, id, type) {
  const v = villages[villageKey];
  if (type === 'neighbor') {
    state.ch2.currentHome = null;
    talkToNeighbor(villageKey);
    return;
  }

  const contact = v.contacts.find(c => c.id === id);
  if (!contact) return;
  state.ch2.currentHome = contact.id;
  renderVillage(villageKey);

  const st = state.ch2.visited[id];
  if (st === 'burned') return;
  if (st === 'success') {
    const recalled = contact.special === 'comboLock' ? (contact.introText + '\n\n' + contact.comboSuccessText) : contact.success;
    showDialogue(withLegalIdentity(contact, recalled), null, contactDialogueScene(contact));
    return;
  }
  talkToContact(villageKey, contact);
}

function talkToContact(villageKey, contact) {
  // 全章只发生一次：第一个被点开的主证人，必定以"记者身份"失败
  if (!state.ch2.firstContactDone) {
    state.ch2.firstContactDone = true;
    state.ch2.visited[contact.id] = 'burned';
    showDialogue(forcedFailText(contact), () => {
      renderVillage(villageKey);
      sendEditorEmail();
    }, contactDialogueScene(contact));
    return;
  }

  if (contact.special === 'comboLock') {
    showDialogue(withLegalIdentity(contact, contact.introText), () => openComboLock(villageKey, contact), contactDialogueScene(contact));
    return;
  }

  state.ch2.visited[contact.id] = 'success';
  renderVillage(villageKey);
  showDialogue(withLegalIdentity(contact, contact.success), () => onContactResolved(villageKey, contact), contactDialogueScene(contact));
}

function withLegalIdentity(contact, text) {
  if (contact.id === 'qiuYuwei' || text.includes('法律工作者')) return text;
  return `你："您好，我们是来了解矿难赔偿处理方式的法律工作者，想跟您核实一下${contact.victim}的情况。"\n${text}`;
}

function talkToNeighbor(villageKey) {
  const v = villages[villageKey];
  const firstVisit = !state.ch2.neighborVisited[villageKey];
  let onClose = null;
  let text = firstVisit
    ? `叙述："${v.intro}"\n${v.neighbor.base}`
    : `${v.neighbor.name}："怎么又回来了？刚才不是已经给你们指过路了吗？"`;

  if (firstVisit) {
    state.ch2.neighborVisited[villageKey] = true;
    const firstContact = v.contacts[0];
    onClose = () => {
      if (firstContact && unlockContact(villageKey, firstContact.id)) {
        renderVillage(villageKey);
        setTimeout(() => toast(`${v.neighbor.name}已经指出了${firstContact.name}家的方向`), 350);
      }
    };
  }

  const burned = v.contacts.find(c => state.ch2.visited[c.id] === 'burned');
  if (burned && !state.ch2.unlockedPhones.includes(burned.phone.id)) {
    text = `你："我们刚去找了${burned.name}，一听说是记者就把门关了。这条线索是不是就断了？"\n${v.neighbor.name}："我就知道会这样。这些年矿上的事把人吓怕了，你们这么直问，谁都不敢开口。"\n${v.neighbor.extra[burned.id]}`;
    onClose = () => {
      state.ch2.unlockedPhones.push(burned.phone.id);
      unlockDock('app-contacts');
      renderContacts();
      renderVillage(villageKey);
      setTimeout(() => toast('通讯录新增联系人：' + burned.phone.name), 500);
    };
  } else if (burned) {
    text = `${v.neighbor.name}："能帮的就这么多了。刚才那个号码你们收好，打电话时慢点说。"`;
  }
  showDialogue(text, onClose, neighborDialogueScene(v));
}

function onContactResolved(villageKey, contact) {
  const v = villages[villageKey];
  const currentIndex = v.contacts.findIndex(c => c.id === contact.id);
  const nextContact = v.contacts[currentIndex + 1];
  if (nextContact && unlockContact(villageKey, nextContact.id)) {
    state.ch2.currentHome = nextContact.id;
    if (state.ch2.currentVillage === villageKey) renderVillage(villageKey);
    setTimeout(() => toast(`新的走访线索：${nextContact.name}`), 500);
    return;
  }
  const allDone = v.contacts.every(isContactDone);
  if (!allDone) return;

  const jump = () => { switchApp('app-map'); renderTownships(); };
  if (villageKey === 'haoxi') {
    addEvidence(v.evidenceName, v.evidenceDescFull, jump);
  } else {
    addEvidence(v.evidenceName, v.evidenceDesc, jump);
  }
  if (villageKey === 'shimen') {
    renderProvinceMap();
    switchApp('app-map');
    setTimeout(() => toast('石门镇信息已全部核实，已返回区域地图。'), 350);
    return;
  }
  if (ch2TownOrder.includes(villageKey)) unlockNextTown(villageKey);
}

// ================== 密码锁（蒿溪镇） ==================
function openComboLock(villageKey, contact) {
  const modal = document.getElementById('combo-modal');
  modal.classList.remove('hidden');
  document.getElementById('combo-input').value = '';
  document.getElementById('combo-error').classList.add('hidden');

  document.getElementById('combo-submit').onclick = () => {
    const val = document.getElementById('combo-input').value.trim();
    if (val === contact.comboCode) {
      modal.classList.add('hidden');
      state.ch2.visited[contact.id] = 'success';
      renderVillage(villageKey);
      showDialogue(contact.comboSuccessText, () => openProtocolPhoto(villageKey, contact), contactDialogueScene(contact));
    } else {
      document.getElementById('combo-error').textContent = contact.comboFailText;
      document.getElementById('combo-error').classList.remove('hidden');
    }
  };
}
document.getElementById('combo-close').addEventListener('click', () => {
  document.getElementById('combo-modal').classList.add('hidden');
});

function openProtocolPhoto(villageKey, contact) {
  const modal = document.getElementById('doc-modal');
  modal.classList.remove('hidden');
  const page = document.getElementById('doc-modal-body');
  page.className = 'pdf-page aged-protocol-page';
  page.innerHTML = `
    <div class="pdf-title">赔偿协议（复印件）</div>
    <div class="pdf-subtitle">刘富民 死亡赔偿协议书</div>
    <div class="protocol-text">
      死者：刘富民　　性别：男<br>
      死亡时间：2018年10月4日<br>
      死亡原因：运输作业时车辆坠入竖井<br>
      赔偿金额：人民币壹佰零叁万元整<br>
      签署双方：恒源矿业有限责任公司（甲方）　刘富民家属（乙方）<br>
      签署日期：2018年10月19日
    </div>
    <div class="protocol-copy-note">复印件 · 字迹局部褪色</div>
    <button class="login-submit" id="doc-confirm-btn">拍照留证</button>
  `;
  document.getElementById('doc-confirm-btn').onclick = () => {
    modal.classList.add('hidden');
    onContactResolved(villageKey, contact);
  };
}
document.getElementById('doc-close').addEventListener('click', () => {
  document.getElementById('doc-modal').classList.add('hidden');
});

// ================== 通讯录 ==================
// 不依附任何村庄/主证人的独立电话联系人（比如第四章的恒源矿业办公室）
const standalonePhones = {
  hengyuanOffice: {
    id: 'hengyuanOffice', name: '恒源矿业办公室', relation: '公司公开电话',
    image: 'assets/hengyuan-office-bg.webp',
    portrait: 'assets/hengyuan-office-character.webp',
    text: '你（电话中）："您好，我们是《方圆周刊》记者，想就矿工死亡瞒报一事，向陆长仁总核实几个问题，方便转达一下吗？"\n接电话的工作人员（语气警惕）："陆总不在，具体情况不清楚，您留个联系方式吧。"\n叙述：三天过去，电话那头始终没有回音。',
    onResolved: () => addEvidence(
      '陆长仁拒绝回应',
      '记者通过公开渠道尝试联系恒源矿业法定代表人陆长仁核实相关情况，截至发稿，对方未予回应。',
      () => callPhoneContact('hengyuanOffice')
    )
  },
  chenMingxuan: {
    id: 'chenMingxuan', name: '陈明轩', relation: '《方圆周刊》责任编辑',
    image: 'assets/editor-night-office.webp',
    portrait: 'assets/chen-mingxuan-character.webp',
    text: publicationCallText,
    onResolved: null
  }
};

function findPhoneOwner(phoneId) {
  for (const key of Object.keys(villages)) {
    const v = villages[key];
    const contact = v.contacts.find(c => c.phone && c.phone.id === phoneId);
    if (contact) return { phone: contact.phone, resolve: () => onContactResolved(key, contact) };
  }
  if (standalonePhones[phoneId]) {
    const sp = standalonePhones[phoneId];
    return { phone: sp, resolve: sp.onResolved };
  }
  return null;
}

function renderContacts() {
  const body = document.getElementById('contacts-body');
  if (state.ch2.unlockedPhones.length === 0) {
    body.innerHTML = '<div class="evidence-empty">暂无联系人</div>';
    return;
  }
  body.innerHTML = state.ch2.unlockedPhones.map(phoneId => {
    const owner = findPhoneOwner(phoneId);
    if (!owner) return '';
    const { phone } = owner;
    const st = state.ch2.visited[phone.id];
    return `
      <div class="contact-card" data-phoneid="${phone.id}">
        <div class="contact-name">${phone.name}</div>
        <div class="contact-relation">${phone.relation}</div>
        <div class="contact-status">${st === 'phone' ? '已通话' : '点击拨打'}</div>
      </div>
    `;
  }).join('');
  body.querySelectorAll('.contact-card').forEach(card => {
    card.addEventListener('click', () => callPhoneContact(card.dataset.phoneid));
  });
}

function callPhoneContact(phoneId) {
  const owner = findPhoneOwner(phoneId);
  if (!owner) return;
  const { phone, resolve } = owner;
  const already = state.ch2.visited[phone.id] === 'phone';
  if (!already) {
    state.ch2.visited[phone.id] = 'phone';
    renderContacts();
  }
  const phoneScene = phone.image
    ? { background: phone.image, portrait: phone.portrait, softPortrait: ['hengyuanOffice', 'chenMingxuan'].includes(phone.id), calendar: false }
    : null;
  showDialogue(phone.text, already ? undefined : resolve, phoneScene);
}

// ================== Dock 切换 ==================
document.querySelectorAll('.dock-icon').forEach(icon => {
  icon.addEventListener('click', () => {
    if (icon.classList.contains('locked')) return;
    switchApp(icon.dataset.app);
  });
});

// ================== 本地进度保存 ==================
// 开发时刷新页面后保留调查进度和所在应用，方便直接查看刚修改的界面。
function evidenceJumpFor(name) {
  if (name === '恒源矿难亡者名单（部分）') return jumpToTipMail;
  if (name === '匿名网友评论残影') return jumpToHiddenComment;
  if (name === '工头身份·法律简讯') return () => jumpToSearch('恒源铁矿 工头');
  if (name === '邱满仓刑事判决书全文' || name === '责任分歧·矿主证言矛盾') return jumpToJudgment;
  if (name === '恒源矿业股东变更记录' || name === '股权变更疑点') return openRegistryDocument;
  if (name === '陆长仁拒绝回应') return () => callPhoneContact('hengyuanOffice');
  if (name.startsWith('新闻《')) {
    const title = name.slice(3, -1);
    const key = Object.keys(targetArticles).find(k => targetArticles[k].title === title);
    return key ? () => jumpToPortalArticle(key) : null;
  }
  if (Object.values(villages).some(v => v.evidenceName === name)) {
    return () => { switchApp('app-map'); renderTownships(); };
  }
  return null;
}

function saveLocalProgress() {
  if (!progressStorageReady) return;
  const activeWindow = document.querySelector('.app-window:not(.hidden)');
  const serializableState = {
    ...state,
    evidence: state.evidence.map(({ name, desc }) => ({ name, desc }))
  };
  const snapshot = {
    state: serializableState,
    chapterNotes: chapters.map(ch => ch.noteAdded),
    ui: {
      activeApp: activeWindow ? activeWindow.id : 'app-mail',
      started: !document.getElementById('start-screen')
    }
  };
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (_) {
    // 无痕模式或存储受限时仍允许游戏继续运行。
  }
}

function restoreLocalProgress() {
  let snapshot;
  try {
    snapshot = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || 'null');
  } catch (_) {
    return null;
  }
  if (!snapshot || !snapshot.state) return null;

  const savedState = snapshot.state;
  Object.assign(state, savedState, {
    ch2: { ...state.ch2, ...(savedState.ch2 || {}) },
    ch3: { ...state.ch3, ...(savedState.ch3 || {}) },
    finale: { ...state.finale, ...(savedState.finale || {}) },
    evidence: (savedState.evidence || []).map(e => ({ ...e, jump: evidenceJumpFor(e.name) }))
  });
  (snapshot.chapterNotes || []).forEach((noteAdded, index) => {
    if (chapters[index]) chapters[index].noteAdded = !!noteAdded;
  });
  return snapshot.ui || null;
}

// ================== 初始化 ==================
const restoredUI = restoreLocalProgress();
inferReadMailsFromProgress();
document.querySelectorAll('#mail-list .mail-item').forEach(item => {
  if (state.mailRead.includes(item.dataset.mail)) item.classList.remove('unread');
});
if (state.ch2.firstContactDone) sendEditorEmail({ silent: true });
if (state.ch3.judgmentEmailSent) sendJudgmentEmail({ silent: true });
updateMailUnreadCount();
renderPortalList();
renderProvinceMap();
renderEvidence();
renderContacts();

if (state.searchUnlocked) unlockDock('app-search');
if (state.evidenceUnlocked) unlockDock('app-evidence');
if (state.mapUnlocked) unlockDock('app-map');
if (state.ch2.unlockedPhones.length) unlockDock('app-contacts');

const restorableApps = ['app-mail', 'app-search', 'app-portal', 'app-map', 'app-village', 'app-contacts', 'app-evidence'];
const restoredApp = restorableApps.includes(restoredUI?.activeApp) ? restoredUI.activeApp : 'app-mail';
if (restoredApp === 'app-village' && state.ch2.currentVillage) renderVillage(state.ch2.currentVillage);
switchApp(restoredApp);

if (restoredUI?.started) document.getElementById('start-screen')?.remove();
progressStorageReady = true;
saveLocalProgress();

document.addEventListener('click', () => setTimeout(saveLocalProgress, 0), true);
document.addEventListener('change', () => setTimeout(saveLocalProgress, 0), true);
window.addEventListener('pagehide', saveLocalProgress);

const startGameButton = document.getElementById('start-game');
if (startGameButton) {
  startGameButton.addEventListener('click', () => {
    const startScreen = document.getElementById('start-screen');
    startScreen.classList.add('leaving');
    setTimeout(() => {
      startScreen.remove();
      toast('收件箱里有一封新邮件。');
      saveLocalProgress();
    }, 560);
  });
}

document.getElementById('restart-game').addEventListener('click', () => {
  if (!window.confirm('重新开始会清除当前调查进度，确定继续吗？')) return;
  progressStorageReady = false;
  localStorage.removeItem(PROGRESS_STORAGE_KEY);
  window.location.href = window.location.pathname;
});
