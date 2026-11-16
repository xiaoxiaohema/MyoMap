#!/usr/bin/env python3
"""
V2版SVG人体肌肉插画 - 解剖学精确比例
参考MuscleWiki风格：流畅轮廓线 + 分区肌肉色块 + 渐变质感
viewBox 0 0 300 750
"""

# ===================== 正面 =====================
svg_front = r'''<svg viewBox="0 0 300 750" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
<defs>
  <linearGradient id="sf" x1=".3" y1="0" x2=".8" y2="1"><stop offset="0%" stop-color="#f2d5b5"/><stop offset="100%" stop-color="#dbb895"/></linearGradient>
  <linearGradient id="mf" x1=".2" y1="0" x2=".9" y2="1"><stop offset="0%" stop-color="#e8aa7a"/><stop offset="100%" stop-color="#c08050"/></linearGradient>
  <linearGradient id="mfl" x1=".2" y1="0" x2=".9" y2="1"><stop offset="0%" stop-color="#f0b888"/><stop offset="100%" stop-color="#cc8c5c"/></linearGradient>
  <linearGradient id="mfd" x1=".2" y1="0" x2=".9" y2="1"><stop offset="0%" stop-color="#d49968"/><stop offset="100%" stop-color="#a46c3c"/></linearGradient>
  <linearGradient id="mfv" x1=".2" y1="0" x2=".9" y2="1"><stop offset="0%" stop-color="#c88e5e"/><stop offset="100%" stop-color="#966030"/></linearGradient>
  <radialGradient id="hl" cx=".45" cy=".3" r=".65"><stop offset="0%" stop-color="#fff5e0" stop-opacity=".45"/><stop offset="100%" stop-color="#fff5e0" stop-opacity="0"/></radialGradient>
  <filter id="ms"><feDropShadow dx="0" dy="1.2" stdDeviation=".8" flood-color="#5a3418" flood-opacity=".22"/></filter>
</defs>

<!-- ========= 身体轮廓 ========= -->
<g id="body-outline">
  <!-- 头 -->
  <ellipse cx="150" cy="46" rx="27" ry="32" fill="url(#sf)"/>
  <!-- 耳 -->
  <ellipse cx="123" cy="48" rx="4" ry="7" fill="#d4ad82"/>
  <ellipse cx="177" cy="48" rx="4" ry="7" fill="#d4ad82"/>
  <!-- 下颌 -->
  <path d="M128 68 Q150 84 172 68 Q162 78 150 80 Q138 78 128 68Z" fill="#d4ad82"/>
  <!-- 脖子 -->
  <path d="M137 80 L135 100 Q150 106 165 100 L163 80Z" fill="url(#sf)"/>
  <!-- 锁骨区 -->
  <path d="M135 100 Q130 106 108 112 Q98 116 94 122 L96 124 Q108 118 134 110 L150 108 L166 110 Q192 118 204 124 L206 122 Q202 116 192 112 Q170 106 165 100Z" fill="#d4ad82"/>

  <!-- 躯干 -->
  <path d="
    M94 124
    C86 134 82 152 82 172
    C82 200 86 228 92 252
    C96 268 98 282 96 298
    L96 298
    C92 318 90 338 94 356
    C98 368 104 376 110 382
    L110 382
    C108 400 108 420 112 438
    C116 452 124 460 134 466
    L134 466
    C136 472 136 480 138 488
    L138 500
    C138 508 136 516 134 524
    Q128 538 126 556
    L126 570
    C128 590 134 608 142 620
    L142 620
    Q134 640 130 666
    Q128 690 132 710
    L132 710
    C130 718 130 728 134 736
    L134 746
    Q136 750 140 750
    L148 750
    C152 750 152 746 152 740
    L152 720
    Q154 698 156 678
    L156 678
    Q158 658 160 640
    L160 620
    L160 620
    Q158 596 156 576
    L156 560
    C156 550 156 540 156 530
    L156 530
    L156 500
    L156 466
    L166 466
    C176 460 184 452 188 438
    C192 420 192 400 190 382
    L190 382
    C196 376 202 368 206 356
    C210 338 208 318 204 298
    L204 298
    C202 282 204 268 208 252
    C214 228 218 200 218 172
    C218 152 214 134 206 124
    Z
  " fill="url(#sf)"/>

  <!-- 右臂 (解剖右侧 = 画面左侧) -->
  <path d="
    M94 124
    C84 128 76 138 72 154
    C66 178 64 206 66 234
    C68 258 74 278 82 294
    C86 302 90 308 94 310
    C98 306 100 298 100 290
    C98 268 96 244 96 220
    C96 198 96 176 98 156
    C98 142 96 132 94 124Z
  " fill="url(#sf)"/>
  <!-- 左臂 -->
  <path d="
    M206 124
    C216 128 224 138 228 154
    C234 178 236 206 234 234
    C232 258 226 278 218 294
    C214 302 210 308 206 310
    C202 306 200 298 200 290
    C202 268 204 244 204 220
    C204 198 204 176 202 156
    C202 142 204 132 206 124Z
  " fill="url(#sf)"/>

  <!-- 右前臂 -->
  <path d="
    M94 310
    C88 322 82 340 78 360
    C74 382 72 404 74 424
    C76 440 82 452 90 460
    C96 464 102 460 106 452
    C104 432 104 410 102 388
    C100 368 98 348 96 332
    C94 320 94 314 94 310Z
  " fill="url(#sf)"/>
  <!-- 左前臂 -->
  <path d="
    M206 310
    C212 322 218 340 222 360
    C226 382 228 404 226 424
    C224 440 218 452 210 460
    C204 464 198 460 194 452
    C196 432 196 410 198 388
    C200 368 202 348 204 332
    C206 320 206 314 206 310Z
  " fill="url(#sf)"/>

  <!-- 手 -->
  <ellipse cx="88" cy="466" rx="10" ry="14" fill="#d4ad82"/>
  <ellipse cx="212" cy="466" rx="10" ry="14" fill="#d4ad82"/>
</g>

<!-- 高光 -->
<ellipse cx="150" cy="240" rx="48" ry="140" fill="url(#hl)" opacity=".6"/>

<!-- ========= 肌肉层 ========= -->
<g id="muscles-front">

  <!-- 斜方肌(上) -->
  <path data-muscle="斜方肌" class="muscle-path" d="
    M140 94
    C134 90 128 92 118 98
    L108 106 Q130 104 150 102 Q170 104 192 106
    L182 98 C172 92 166 90 160 94
    Q155 98 150 98 Q145 98 140 94Z
  " fill="url(#mfv)" filter="url(#ms)"/>

  <!-- 三角肌 右 -->
  <path data-muscle="三角肌" class="muscle-path" d="
    M96 122
    C88 128 80 142 78 160
    C78 176 82 190 88 200
    C94 204 100 200 104 192
    C104 172 104 154 104 140
    C104 130 100 124 96 122Z
  " fill="url(#mfl)" filter="url(#ms)"/>
  <!-- 三角肌 左 -->
  <path data-muscle="三角肌" class="muscle-path" d="
    M204 122
    C212 128 220 142 222 160
    C222 176 218 190 212 200
    C206 204 200 200 196 192
    C196 172 196 154 196 140
    C196 130 200 124 204 122Z
  " fill="url(#mfl)" filter="url(#ms)"/>

  <!-- 胸大肌 右 -->
  <path data-muscle="胸大肌" class="muscle-path" d="
    M108 120
    C102 130 98 150 98 172
    C100 190 108 206 128 218
    C138 222 146 218 148 210
    C146 192 144 172 142 158
    C138 142 126 128 116 122Z
  " fill="url(#mf)" filter="url(#ms)"/>
  <!-- 胸大肌 左 -->
  <path data-muscle="胸大肌" class="muscle-path" d="
    M192 120
    C198 130 202 150 202 172
    C200 190 192 206 172 218
    C162 222 154 218 152 210
    C154 192 156 172 158 158
    C162 142 174 128 184 122Z
  " fill="url(#mf)" filter="url(#ms)"/>
  <!-- 胸肌中线 -->
  <line x1="150" y1="120" x2="150" y2="215" stroke="#a06838" stroke-width=".8" opacity=".3"/>

  <!-- 肱二头肌 右 -->
  <path data-muscle="肱二头肌" class="muscle-path" d="
    M78 156
    C74 170 72 192 74 216
    C78 230 86 236 92 232
    C94 218 94 198 94 180
    C94 166 90 158 86 152Z
  " fill="url(#mf)" filter="url(#ms)"/>
  <!-- 肱二头肌 左 -->
  <path data-muscle="肱二头肌" class="muscle-path" d="
    M222 156
    C226 170 228 192 226 216
    C222 230 214 236 208 232
    C206 218 206 198 206 180
    C206 166 210 158 214 152Z
  " fill="url(#mf)" filter="url(#ms)"/>

  <!-- 腹直肌 -->
  <g data-muscle="腹直肌" class="muscle-path">
    <rect x="140" y="222" width="14" height="22" rx="5" fill="url(#mfl)" filter="url(#ms)"/>
    <rect x="146" y="222" width="14" height="22" rx="5" fill="url(#mfl)" filter="url(#ms)"/>
    <rect x="140" y="248" width="14" height="22" rx="5" fill="url(#mf)" filter="url(#ms)"/>
    <rect x="146" y="248" width="14" height="22" rx="5" fill="url(#mf)" filter="url(#ms)"/>
    <rect x="140" y="274" width="14" height="22" rx="5" fill="url(#mfd)" filter="url(#ms)"/>
    <rect x="146" y="274" width="14" height="22" rx="5" fill="url(#mfd)" filter="url(#ms)"/>
    <rect x="140" y="300" width="14" height="24" rx="5" fill="url(#mfd)" filter="url(#ms)"/>
    <rect x="146" y="300" width="14" height="24" rx="5" fill="url(#mfd)" filter="url(#ms)"/>
    <!-- 腹白线 -->
    <rect x="149" y="220" width="2" height="108" fill="#8a5828" opacity=".2" rx="1"/>
  </g>

  <!-- 腹外斜肌 右 -->
  <g data-muscle="腹外斜肌" class="muscle-path">
    <path d="M110 228 C106 244 106 264 110 284 C116 290 124 286 128 278 C124 260 122 240 120 224Z" fill="url(#mfv)" filter="url(#ms)"/>
    <path d="M110 290 C108 308 110 328 114 348 C120 354 128 348 130 338 C126 318 122 298 118 282Z" fill="url(#mfv)" filter="url(#ms)"/>
  </g>
  <!-- 腹外斜肌 左 -->
  <g data-muscle="腹外斜肌" class="muscle-path">
    <path d="M190 228 C194 244 194 264 190 284 C184 290 176 286 172 278 C176 260 178 240 180 224Z" fill="url(#mfv)" filter="url(#ms)"/>
    <path d="M190 290 C192 308 190 328 186 348 C180 354 172 348 170 338 C174 318 178 298 182 282Z" fill="url(#mfv)" filter="url(#ms)"/>
  </g>

  <!-- 前臂肌群 右 -->
  <path data-muscle="前臂肌群" class="muscle-path" d="
    M82 328
    C78 348 74 372 74 396
    C76 414 82 428 90 436
    C96 440 102 434 104 424
    C102 402 100 380 98 360
    C96 344 90 334 86 328Z
  " fill="url(#mfd)" filter="url(#ms)" opacity=".85"/>
  <!-- 前臂肌群 左 -->
  <path data-muscle="前臂肌群" class="muscle-path" d="
    M218 328
    C222 348 226 372 226 396
    C224 414 218 428 210 436
    C204 440 198 434 196 424
    C198 402 200 380 202 360
    C204 344 210 334 214 328Z
  " fill="url(#mfd)" filter="url(#ms)" opacity=".85"/>

  <!-- 股四头肌 右 -->
  <path data-muscle="股四头肌" class="muscle-path" d="
    M134 490
    C128 510 126 536 128 564
    C130 588 134 610 140 626
    C146 632 152 626 154 618
    C154 594 154 568 154 544
    C154 524 154 508 154 494Z
  " fill="url(#mf)" filter="url(#ms)"/>
  <!-- 股四头肌 左 -->
  <path data-muscle="股四头肌" class="muscle-path" d="
    M166 490
    C172 510 174 536 172 564
    C170 588 166 610 160 626
    C154 632 148 626 146 618
    C146 594 146 568 146 544
    C146 524 146 508 146 494Z
  " fill="url(#mf)" filter="url(#ms)"/>

  <!-- 内收肌 右 -->
  <path data-muscle="内收肌群" class="muscle-path" d="
    M154 492
    C152 512 148 540 146 570
    C144 596 144 618 146 636
    C148 640 152 636 154 628
    C154 606 154 582 154 558
    C154 536 154 516 154 498Z
  " fill="url(#mfv)" filter="url(#ms)" opacity=".8"/>
  <!-- 内收肌 左 -->
  <path data-muscle="内收肌群" class="muscle-path" d="
    M146 492
    C148 512 152 540 154 570
    C156 596 156 618 154 636
    C152 640 148 636 146 628
    C146 606 146 582 146 558
    C146 536 146 516 146 498Z
  " fill="url(#mfv)" filter="url(#ms)" opacity=".8"/>

  <!-- 小腿肌群 右 -->
  <path data-muscle="小腿肌群" class="muscle-path" d="
    M134 666
    C130 682 128 700 130 718
    C132 728 136 734 142 736
    C146 730 148 722 148 712
    C148 696 146 680 144 668Z
  " fill="url(#mfd)" filter="url(#ms)"/>
  <!-- 小腿肌群 左 -->
  <path data-muscle="小腿肌群" class="muscle-path" d="
    M166 666
    C170 682 172 700 170 718
    C168 728 164 734 158 736
    C154 730 152 722 152 712
    C152 696 154 680 156 668Z
  " fill="url(#mfd)" filter="url(#ms)"/>

  <!-- 臀大肌(正面可见侧) 右 -->
  <path data-muscle="臀大肌" class="muscle-path" d="
    M114 398
    C108 414 108 432 114 446
    C126 452 136 444 138 434
    C134 418 126 406 116 400Z
  " fill="url(#mfv)" filter="url(#ms)" opacity=".75"/>
  <!-- 臀大肌 左 -->
  <path data-muscle="臀大肌" class="muscle-path" d="
    M186 398
    C192 414 192 432 186 446
    C174 452 164 444 162 434
    C166 418 174 406 184 400Z
  " fill="url(#mfv)" filter="url(#ms)" opacity=".75"/>
</g>
</svg>'''

# ===================== 背面 =====================
svg_back = r'''<svg viewBox="0 0 300 750" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
<defs>
  <linearGradient id="sb" x1=".3" y1="0" x2=".8" y2="1"><stop offset="0%" stop-color="#f0d2b2"/><stop offset="100%" stop-color="#d8b490"/></linearGradient>
  <linearGradient id="mb" x1=".2" y1="0" x2=".9" y2="1"><stop offset="0%" stop-color="#e0a070"/><stop offset="100%" stop-color="#b87844"/></linearGradient>
  <linearGradient id="mbl" x1=".2" y1="0" x2=".9" y2="1"><stop offset="0%" stop-color="#eab080"/><stop offset="100%" stop-color="#c48854"/></linearGradient>
  <linearGradient id="mbd" x1=".2" y1="0" x2=".9" y2="1"><stop offset="0%" stop-color="#d09262"/><stop offset="100%" stop-color="#9e6834"/></linearGradient>
  <linearGradient id="mbv" x1=".2" y1="0" x2=".9" y2="1"><stop offset="0%" stop-color="#c48856"/><stop offset="100%" stop-color="#8e5828"/></linearGradient>
  <radialGradient id="hlb" cx=".5" cy=".3" r=".65"><stop offset="0%" stop-color="#fff5e0" stop-opacity=".4"/><stop offset="100%" stop-color="#fff5e0" stop-opacity="0"/></radialGradient>
  <filter id="msb"><feDropShadow dx="0" dy="1.2" stdDeviation=".8" flood-color="#5a3418" flood-opacity=".22"/></filter>
</defs>

<!-- 身体轮廓(背面) -->
<g id="body-outline-back">
  <ellipse cx="150" cy="46" rx="27" ry="32" fill="url(#sb)"/>
  <ellipse cx="123" cy="48" rx="4" ry="7" fill="#d0a87e"/>
  <ellipse cx="177" cy="48" rx="4" ry="7" fill="#d0a87e"/>
  <path d="M128 68 Q150 80 172 68 Q162 76 150 78 Q138 76 128 68Z" fill="#d0a87e"/>
  <path d="M137 80 L135 100 Q150 106 165 100 L163 80Z" fill="url(#sb)"/>

  <!-- 躯干背 -->
  <path d="
    M94 124
    C84 134 80 152 80 172
    C80 202 84 232 90 258
    C94 276 96 294 94 314
    C90 336 90 358 96 378
    C100 392 106 400 112 406
    L112 406
    C110 424 112 444 118 460
    C124 472 132 480 140 486
    L140 486
    C136 504 134 524 136 546
    C138 562 142 578 148 592
    L148 592
    Q140 612 136 638
    Q134 664 136 688
    L136 688
    C134 700 134 714 138 726
    L138 738
    Q140 744 144 746
    L150 746
    C154 744 156 738 156 732
    L156 716
    Q158 694 156 672
    L156 672
    Q154 650 154 630
    L154 594
    L154 592
    Q160 578 164 562
    C166 546 166 528 162 510
    L162 486
    C170 480 178 472 184 460
    C190 444 192 424 190 406
    L190 406
    C196 400 202 392 206 378
    C212 358 212 336 208 314
    C206 294 208 276 212 258
    C218 232 222 202 222 172
    C222 152 218 134 208 124
    Z
  " fill="url(#sb)"/>

  <!-- 右臂 -->
  <path d="M94 124 C84 128 76 138 72 154 C66 178 64 206 66 234 C68 258 74 278 82 294 C86 302 90 308 94 310 C98 306 100 298 100 290 C98 268 96 244 96 220 C96 198 96 176 98 156 C98 142 96 132 94 124Z" fill="url(#sb)"/>
  <!-- 左臂 -->
  <path d="M206 124 C216 128 224 138 228 154 C234 178 236 206 234 234 C232 258 226 278 218 294 C214 302 210 308 206 310 C202 306 200 298 200 290 C202 268 204 244 204 220 C204 198 204 176 202 156 C202 142 204 132 206 124Z" fill="url(#sb)"/>
  <!-- 右前臂 -->
  <path d="M94 310 C88 322 82 340 78 360 C74 382 72 404 74 424 C76 440 82 452 90 460 C96 464 102 460 106 452 C104 432 104 410 102 388 C100 368 98 348 96 332Z" fill="url(#sb)"/>
  <!-- 左前臂 -->
  <path d="M206 310 C212 322 218 340 222 360 C226 382 228 404 226 424 C224 440 218 452 210 460 C204 464 198 460 194 452 C196 432 196 410 198 388 C200 368 202 348 204 332Z" fill="url(#sb)"/>
  <ellipse cx="88" cy="466" rx="10" ry="14" fill="#d0a87e"/>
  <ellipse cx="212" cy="466" rx="10" ry="14" fill="#d0a87e"/>
</g>

<ellipse cx="150" cy="260" rx="46" ry="140" fill="url(#hlb)" opacity=".55"/>

<!-- 肌肉层(背面) -->
<g id="muscles-back">
  <!-- 斜方肌(大菱形) -->
  <path data-muscle="斜方肌" class="muscle-path" d="
    M150 98
    C130 102 108 116 94 138
    C112 142 134 138 150 134
    C166 138 188 142 206 138
    C192 116 170 102 150 98Z
  " fill="url(#mbv)" filter="url(#msb)"/>
  <!-- 斜方肌(中下) -->
  <path data-muscle="斜方肌" class="muscle-path" d="
    M100 186
    C120 170 140 164 150 162
    C160 164 180 170 200 186
    C190 210 172 222 150 218
    C128 222 110 210 100 186Z
  " fill="url(#mbd)" filter="url(#msb)" opacity=".9"/>

  <!-- 三角肌后束 右 -->
  <path data-muscle="三角肌" class="muscle-path" d="
    M94 138
    C86 146 80 162 80 180
    C84 194 92 200 98 194
    C100 178 100 160 100 146Z
  " fill="url(#mb)" filter="url(#msb)"/>
  <!-- 三角肌后束 左 -->
  <path data-muscle="三角肌" class="muscle-path" d="
    M206 138
    C214 146 220 162 220 180
    C216 194 208 200 202 194
    C200 178 200 160 200 146Z
  " fill="url(#mb)" filter="url(#msb)"/>

  <!-- 背阔肌 右 -->
  <path data-muscle="背阔肌" class="muscle-path" d="
    M98 218
    C90 240 86 270 88 304
    C98 322 118 326 136 312
    C140 290 138 264 134 244
    C128 232 114 224 100 218Z
  " fill="url(#mbd)" filter="url(#msb)"/>
  <!-- 背阔肌 左 -->
  <path data-muscle="背阔肌" class="muscle-path" d="
    M202 218
    C210 240 214 270 212 304
    C202 322 182 326 164 312
    C160 290 162 264 166 244
    C172 232 186 224 200 218Z
  " fill="url(#mbd)" filter="url(#msb)"/>

  <!-- 中背部(菱形肌) -->
  <path data-muscle="中背部" class="muscle-path" d="
    M130 218
    C140 210 146 208 150 208
    C154 208 160 210 170 218
    C168 242 160 258 150 262
    C140 258 132 242 130 218Z
  " fill="url(#mb)" filter="url(#msb)"/>

  <!-- 下背部(竖脊肌) -->
  <g data-muscle="下背部" class="muscle-path">
    <path d="M140 310 C138 340 138 368 140 394 C144 404 150 406 152 398 C152 370 152 342 150 314Z" fill="url(#mbd)" filter="url(#msb)"/>
    <path d="M160 310 C162 340 162 368 160 394 C156 404 150 406 148 398 C148 370 148 342 150 314Z" fill="url(#mbd)" filter="url(#msb)"/>
  </g>

  <!-- 肱三头肌 右 -->
  <path data-muscle="肱三头肌" class="muscle-path" d="
    M74 162
    C70 178 68 202 70 228
    C76 238 86 240 92 234
    C92 214 90 194 90 176
    C90 166 86 160 82 156Z
  " fill="url(#mb)" filter="url(#msb)"/>
  <!-- 肱三头肌 左 -->
  <path data-muscle="肱三头肌" class="muscle-path" d="
    M226 162
    C230 178 232 202 230 228
    C224 238 214 240 208 234
    C208 214 210 194 210 176
    C210 166 214 160 218 156Z
  " fill="url(#mb)" filter="url(#msb)"/>

  <!-- 前臂伸肌 右 -->
  <path data-muscle="前臂肌群" class="muscle-path" d="
    M84 326
    C80 346 76 370 76 394
    C80 410 90 416 96 408
    C96 386 96 364 98 346
    C96 336 90 330 86 326Z
  " fill="url(#mbd)" filter="url(#msb)" opacity=".85"/>
  <!-- 前臂伸肌 左 -->
  <path data-muscle="前臂肌群" class="muscle-path" d="
    M216 326
    C220 346 224 370 224 394
    C220 410 210 416 204 408
    C204 386 204 364 202 346
    C204 336 210 330 214 326Z
  " fill="url(#mbd)" filter="url(#msb)" opacity=".85"/>

  <!-- 臀大肌 右 -->
  <path data-muscle="臀大肌" class="muscle-path" d="
    M118 448
    C110 464 108 486 114 504
    C132 512 148 502 152 488
    C148 472 138 458 124 450Z
  " fill="url(#mbd)" filter="url(#msb)"/>
  <!-- 臀大肌 左 -->
  <path data-muscle="臀大肌" class="muscle-path" d="
    M182 448
    C190 464 192 486 186 504
    C168 512 152 502 148 488
    C152 472 162 458 176 450Z
  " fill="url(#mbd)" filter="url(#msb)"/>

  <!-- 腘绳肌 右 -->
  <path data-muscle="腘绳肌" class="muscle-path" d="
    M140 530
    C136 552 134 578 134 606
    C136 630 140 650 146 664
    C150 668 154 662 154 652
    C154 626 154 600 154 576
    C154 556 154 540 154 528Z
  " fill="url(#mb)" filter="url(#msb)"/>
  <!-- 腘绳肌 左 -->
  <path data-muscle="腘绳肌" class="muscle-path" d="
    M160 530
    C164 552 166 578 166 606
    C164 630 160 650 154 664
    C150 668 146 662 146 652
    C146 626 146 600 146 576
    C146 556 146 540 146 528Z
  " fill="url(#mb)" filter="url(#msb)"/>

  <!-- 小腿肌群(腓肠肌) 右 -->
  <path data-muscle="小腿肌群" class="muscle-path" d="
    M136 688
    C132 704 130 720 132 732
    C134 738 140 740 144 736
    C146 726 146 714 146 700
    C146 694 142 690 138 688Z
  " fill="url(#mb)" filter="url(#msb)"/>
  <ellipse data-muscle="小腿肌群" class="muscle-path" cx="140" cy="704" rx="9" ry="12" fill="url(#mb)" filter="url(#msb)"/>
  <!-- 小腿肌群 左 -->
  <path data-muscle="小腿肌群" class="muscle-path" d="
    M164 688
    C168 704 170 720 168 732
    C166 738 160 740 156 736
    C154 726 154 714 154 700
    C154 694 158 690 162 688Z
  " fill="url(#mb)" filter="url(#msb)"/>
  <ellipse data-muscle="小腿肌群" class="muscle-path" cx="160" cy="704" rx="9" ry="12" fill="url(#mb)" filter="url(#msb)"/>
</g>
</svg>'''

with open('svg_front.svg', 'w', encoding='utf-8') as f:
    f.write(svg_front)
with open('svg_back.svg', 'w', encoding='utf-8') as f:
    f.write(svg_back)

print(f"正面SVG: {len(svg_front)} 字符")
print(f"背面SVG: {len(svg_back)} 字符")
