#!/usr/bin/env python3
"""
方案二：MuscleWiki风格2D肌肉SVG + CSS 3D交互
生成SVG和集成代码
"""

# ==================== 正面SVG ====================
svg_front = '''<svg viewBox="0 0 400 800" xmlns="http://www.w3.org/2000/svg" class="body-svg" preserveAspectRatio="xMidYMid meet">
  <defs>
    <!-- 皮肤渐变 -->
    <linearGradient id="skinGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f5d4b0"/>
      <stop offset="50%" stop-color="#ecc69c"/>
      <stop offset="100%" stop-color="#d9b082"/>
    </linearGradient>
    <radialGradient id="skinHighlight" cx="0.5" cy="0.3" r="0.7">
      <stop offset="0%" stop-color="#fff1d6" stop-opacity="0.6"/>
      <stop offset="60%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <!-- 阴影 -->
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity="0.15"/>
    </filter>
    <filter id="innerShadow">
      <feOffset dx="0" dy="1"/>
      <feGaussianBlur stdDeviation="1" result="offset-blur"/>
      <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
      <feFlood flood-color="#8b5a2b" flood-opacity="0.2" result="color"/>
      <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
      <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
    </filter>
    <filter id="muscleShadow">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1" flood-color="#6b3a1a" flood-opacity="0.25"/>
    </filter>
    <filter id="glowOrange">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <!-- 肌肉基础色 -->
    <linearGradient id="chestGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e8a876"/>
      <stop offset="100%" stop-color="#c88452"/>
    </linearGradient>
    <linearGradient id="abGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e0a06e"/>
      <stop offset="100%" stop-color="#b87a48"/>
    </linearGradient>
    <linearGradient id="armGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#de9e70"/>
      <stop offset="100%" stop-color="#b87848"/>
    </linearGradient>
    <linearGradient id="legGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#d99a6c"/>
      <stop offset="100%" stop-color="#b07244"/>
    </linearGradient>
    <linearGradient id="shoulderGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e5a878"/>
      <stop offset="100%" stop-color="#c48050"/>
    </linearGradient>
    <linearGradient id="obliqueGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#d49466"/>
      <stop offset="100%" stop-color="#a87040"/>
    </linearGradient>
  </defs>

  <!-- 身体轮廓（皮肤） -->
  <g class="skin-layer">
    <!-- 头部 -->
    <ellipse cx="200" cy="62" rx="38" ry="45" fill="url(#skinGrad)" filter="url(#softShadow)"/>
    <!-- 下颌 -->
    <path d="M175 92 Q200 118 225 92 Q215 108 200 110 Q185 108 175 92Z" fill="#d9b082"/>
    <!-- 脖子 -->
    <path d="M182 108 L180 138 Q200 146 220 138 L218 108 Z" fill="url(#skinGrad)"/>
    
    <!-- 躯干主体 -->
    <path d="
      M145 140
      Q128 155 120 180
      Q112 210 110 245
      Q108 285 114 325
      Q122 370 130 405
      Q136 440 132 470
      L122 470
      Q120 490 125 510
      Q122 505 120 495
      Q112 480 114 465
      L108 450
      Q90 430 85 400
      Q78 360 82 320
      Q88 275 100 240
      Q105 220 108 200
      Q110 180 108 160
      Q106 148 115 142
      L145 140
      M255 140
      Q272 155 280 180
      Q288 210 290 245
      Q292 285 286 325
      Q278 370 270 405
      Q264 440 268 470
      L278 470
      Q280 490 275 510
      Q278 505 280 495
      Q288 480 286 465
      L292 450
      Q310 430 315 400
      Q322 360 318 320
      Q312 275 300 240
      Q295 220 292 200
      Q290 180 292 160
      Q294 148 285 142
      L255 140Z
    " fill="url(#skinGrad)" filter="url(#softShadow)"/>
    
    <!-- 躯干正面主体轮廓平滑 -->
    <path d="
      M140 145
      C130 160 125 185 124 215
      C123 255 128 295 136 330
      C142 360 146 385 145 410
      C144 435 146 460 150 468
      L250 468
      C254 460 256 435 255 410
      C254 385 258 360 264 330
      C272 295 277 255 276 215
      C275 185 270 160 260 145
      C245 138 200 132 200 132
      C200 132 155 138 140 145Z
    " fill="url(#skinGrad)"/>
    
    <!-- 上臂 -->
    <path d="
      M115 142
      C100 145 88 158 82 180
      C74 215 72 255 78 290
      C82 315 90 335 100 352
      C110 345 116 330 118 315
      C116 280 118 245 124 215
      C126 190 128 165 128 150Z
    " fill="url(#skinGrad)" filter="url(#softShadow)"/>
    <path d="
      M285 142
      C300 145 312 158 318 180
      C326 215 328 255 322 290
      C318 315 310 335 300 352
      C290 345 284 330 282 315
      C284 280 282 245 276 215
      C274 190 272 165 272 150Z
    " fill="url(#skinGrad)" filter="url(#softShadow)"/>
    
    <!-- 前臂 -->
    <path d="
      M100 352
      C90 370 82 395 78 422
      C74 450 75 475 82 498
      C95 502 105 495 110 482
      C114 455 116 428 114 402
      C112 380 108 365 100 352Z
    " fill="url(#skinGrad)" filter="url(#softShadow)"/>
    <path d="
      M300 352
      C310 370 318 395 322 422
      C326 450 325 475 318 498
      C305 502 295 495 290 482
      C286 455 284 428 286 402
      C288 380 292 365 300 352Z
    " fill="url(#skinGrad)" filter="url(#softShadow)"/>
    
    <!-- 手部 -->
    <ellipse cx="92" cy="505" rx="14" ry="18" fill="url(#skinGrad)" filter="url(#softShadow)"/>
    <ellipse cx="308" cy="505" rx="14" ry="18" fill="url(#skinGrad)" filter="url(#softShadow)"/>
    
    <!-- 腰臀部 -->
    <path d="
      M150 468
      C144 478 140 490 142 505
      C145 530 152 548 160 560
      L160 560
      C148 575 142 598 140 625
      L240 625
      L240 560
      C252 548 259 530 258 505
      C260 490 256 478 250 468Z
    " fill="url(#skinGrad)" filter="url(#softShadow)"/>
    
    <!-- 大腿 -->
    <path d="
      M160 560
      C150 580 144 610 140 645
      C136 690 138 720 148 745
      C160 748 172 740 178 728
      C180 690 182 655 185 625
      C188 600 190 582 192 565Z
    " fill="url(#skinGrad)" filter="url(#softShadow)"/>
    <path d="
      M240 560
      C250 580 256 610 260 645
      C264 690 262 720 252 745
      C240 748 228 740 222 728
      C220 690 218 655 215 625
      C212 600 210 582 208 565Z
    " fill="url(#skinGrad)" filter="url(#softShadow)"/>
    
    <!-- 小腿 -->
    <path d="
      M162 745
      C155 760 150 780 148 802
      L185 802
      C188 778 188 758 184 745Z
    " fill="url(#skinGrad)" filter="url(#softShadow)"/>
    <path d="
      M238 745
      C245 760 250 780 252 802
      L215 802
      C212 778 212 758 216 745Z
    " fill="url(#skinGrad)" filter="url(#softShadow)"/>
    
    <!-- 脚部 -->
    <ellipse cx="165" cy="810" rx="22" ry="8" fill="#d9b082" filter="url(#softShadow)"/>
    <ellipse cx="235" cy="810" rx="22" ry="8" fill="#d9b082" filter="url(#softShadow)"/>
    
    <!-- 皮肤高光 -->
    <ellipse cx="200" cy="250" rx="70" ry="180" fill="url(#skinHighlight)" opacity="0.7"/>
  </g>

  <!-- ========== 肌肉层 ========== -->
  <g class="muscle-layer">
    <!-- 胸大肌 左 -->
    <path data-muscle="胸大肌" class="muscle-path" d="
      M148 185
      C140 200 138 230 142 255
      C150 275 165 290 190 295
      C196 280 196 255 192 235
      C184 215 172 198 158 188Z
    " fill="url(#chestGrad)" filter="url(#muscleShadow)"/>
    <!-- 胸大肌 右 -->
    <path data-muscle="胸大肌" class="muscle-path" d="
      M252 185
      C260 200 262 230 258 255
      C250 275 235 290 210 295
      C204 280 204 255 208 235
      C216 215 228 198 242 188Z
    " fill="url(#chestGrad)" filter="url(#muscleShadow)"/>
    
    <!-- 三角肌前束 左 -->
    <path data-muscle="三角肌" class="muscle-path" d="
      M120 148
      C108 155 100 175 100 198
      C104 210 115 218 130 218
      C134 195 134 175 130 158Z
    " fill="url(#shoulderGrad)" filter="url(#muscleShadow)"/>
    <!-- 三角肌前束 右 -->
    <path data-muscle="三角肌" class="muscle-path" d="
      M280 148
      C292 155 300 175 300 198
      C296 210 285 218 270 218
      C266 195 266 175 270 158Z
    " fill="url(#shoulderGrad)" filter="url(#muscleShadow)"/>
    
    <!-- 腹肌 - 8块 -->
    <g data-muscle="腹直肌" class="muscle-path">
      <rect x="178" y="252" width="20" height="28" rx="6" fill="url(#abGrad)" filter="url(#muscleShadow)"/>
      <rect x="202" y="252" width="20" height="28" rx="6" fill="url(#abGrad)" filter="url(#muscleShadow)"/>
      <rect x="178" y="285" width="20" height="28" rx="6" fill="url(#abGrad)" filter="url(#muscleShadow)"/>
      <rect x="202" y="285" width="20" height="28" rx="6" fill="url(#abGrad)" filter="url(#muscleShadow)"/>
      <rect x="178" y="318" width="20" height="28" rx="6" fill="url(#abGrad)" filter="url(#muscleShadow)"/>
      <rect x="202" y="318" width="20" height="28" rx="6" fill="url(#abGrad)" filter="url(#muscleShadow)"/>
      <rect x="178" y="351" width="20" height="30" rx="6" fill="url(#abGrad)" filter="url(#muscleShadow)"/>
      <rect x="202" y="351" width="20" height="30" rx="6" fill="url(#abGrad)" filter="url(#muscleShadow)"/>
    </g>
    <!-- 腹白线 -->
    <rect x="199" y="250" width="2" height="135" fill="#8b5a2b" opacity="0.25"/>
    
    <!-- 腹外斜肌 左 -->
    <g data-muscle="腹外斜肌" class="muscle-path">
      <ellipse cx="148" cy="270" rx="14" ry="22" transform="rotate(-20 148 270)" fill="url(#obliqueGrad)" filter="url(#muscleShadow)"/>
      <ellipse cx="145" cy="305" rx="14" ry="22" transform="rotate(-20 145 305)" fill="url(#obliqueGrad)" filter="url(#muscleShadow)"/>
      <ellipse cx="143" cy="340" rx="13" ry="20" transform="rotate(-15 143 340)" fill="url(#obliqueGrad)" filter="url(#muscleShadow)"/>
      <ellipse cx="142" cy="375" rx="12" ry="18" transform="rotate(-10 142 375)" fill="url(#obliqueGrad)" filter="url(#muscleShadow)"/>
    </g>
    <!-- 腹外斜肌 右 -->
    <g data-muscle="腹外斜肌" class="muscle-path">
      <ellipse cx="252" cy="270" rx="14" ry="22" transform="rotate(20 252 270)" fill="url(#obliqueGrad)" filter="url(#muscleShadow)"/>
      <ellipse cx="255" cy="305" rx="14" ry="22" transform="rotate(20 255 305)" fill="url(#obliqueGrad)" filter="url(#muscleShadow)"/>
      <ellipse cx="257" cy="340" rx="13" ry="20" transform="rotate(15 257 340)" fill="url(#obliqueGrad)" filter="url(#muscleShadow)"/>
      <ellipse cx="258" cy="375" rx="12" ry="18" transform="rotate(10 258 375)" fill="url(#obliqueGrad)" filter="url(#muscleShadow)"/>
    </g>
    
    <!-- 肱二头肌 左 -->
    <path data-muscle="肱二头肌" class="muscle-path" d="
      M90 210
      C82 225 80 255 85 282
      C92 292 105 288 110 278
      C108 255 106 235 104 220Z
    " fill="url(#armGrad)" filter="url(#muscleShadow)"/>
    <!-- 肱二头肌 右 -->
    <path data-muscle="肱二头肌" class="muscle-path" d="
      M310 210
      C318 225 320 255 315 282
      C308 292 295 288 290 278
      C292 255 294 235 296 220Z
    " fill="url(#armGrad)" filter="url(#muscleShadow)"/>
    
    <!-- 前臂肌群 左 -->
    <path data-muscle="前臂肌群" class="muscle-path" d="
      M86 358
      C80 380 76 410 78 438
      C86 448 100 442 104 428
      C102 402 100 382 98 365Z
    " fill="url(#armGrad)" filter="url(#muscleShadow)" opacity="0.85"/>
    <!-- 前臂肌群 右 -->
    <path data-muscle="前臂肌群" class="muscle-path" d="
      M314 358
      C320 380 324 410 322 438
      C314 448 300 442 296 428
      C298 402 300 382 302 365Z
    " fill="url(#armGrad)" filter="url(#muscleShadow)" opacity="0.85"/>
    
    <!-- 斜方肌上部 -->
    <path data-muscle="斜方肌" class="muscle-path" d="
      M155 132
      C148 118 152 108 168 105
      L200 115
      L232 105
      C248 108 252 118 245 132
      C230 128 200 126 200 126
      C200 126 170 128 155 132Z
    " fill="url(#shoulderGrad)" filter="url(#muscleShadow)" opacity="0.9"/>
    
    <!-- 股四头肌 左 -->
    <path data-muscle="股四头肌" class="muscle-path" d="
      M162 568
      C154 595 150 630 150 665
      C154 690 164 710 178 718
      C182 685 184 655 186 628
      C188 602 188 585 186 570Z
    " fill="url(#legGrad)" filter="url(#muscleShadow)"/>
    <!-- 股四头肌 右 -->
    <path data-muscle="股四头肌" class="muscle-path" d="
      M238 568
      C246 595 250 630 250 665
      C246 690 236 710 222 718
      C218 685 216 655 214 628
      C212 602 212 585 214 570Z
    " fill="url(#legGrad)" filter="url(#muscleShadow)"/>
    
    <!-- 内收肌 左 -->
    <path data-muscle="内收肌群" class="muscle-path" d="
      M188 568
      C180 595 176 630 178 665
      C180 695 184 718 188 730
      C188 705 190 675 190 645
      C190 610 192 588 192 570Z
    " fill="url(#obliqueGrad)" filter="url(#muscleShadow)" opacity="0.85"/>
    <!-- 内收肌 右 -->
    <path data-muscle="内收肌群" class="muscle-path" d="
      M212 568
      C220 595 224 630 222 665
      C220 695 216 718 212 730
      C212 705 210 675 210 645
      C210 610 208 588 208 570Z
    " fill="url(#obliqueGrad)" filter="url(#muscleShadow)" opacity="0.85"/>
    
    <!-- 小腿肌群 左 -->
    <path data-muscle="小腿肌群" class="muscle-path" d="
      M162 740
      C155 762 150 788 150 802
      L184 802
      C184 780 182 762 178 745Z
    " fill="url(#legGrad)" filter="url(#muscleShadow)"/>
    <!-- 小腿肌群 右 -->
    <path data-muscle="小腿肌群" class="muscle-path" d="
      M238 740
      C245 762 250 788 250 802
      L216 802
      C216 780 218 762 222 745Z
    " fill="url(#legGrad)" filter="url(#muscleShadow)"/>
    
    <!-- 臀大肌（正面边缘可见） -->
    <path data-muscle="臀大肌" class="muscle-path" d="
      M152 500
      C142 515 142 532 150 548
      C165 552 182 542 188 530
      C182 518 172 508 152 500Z
    " fill="url(#obliqueGrad)" filter="url(#muscleShadow)" opacity="0.8"/>
    <path data-muscle="臀大肌" class="muscle-path" d="
      M248 500
      C258 515 258 532 250 548
      C235 552 218 542 212 530
      C218 518 228 508 248 500Z
    " fill="url(#obliqueGrad)" filter="url(#muscleShadow)" opacity="0.8"/>
  </g>
</svg>'''

# ==================== 背面SVG ====================
svg_back = '''<svg viewBox="0 0 400 800" xmlns="http://www.w3.org/2000/svg" class="body-svg" preserveAspectRatio="xMidYMid meet">
  <defs>
    <linearGradient id="skinGradB" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f5d4b0"/>
      <stop offset="50%" stop-color="#ecc69c"/>
      <stop offset="100%" stop-color="#d9b082"/>
    </linearGradient>
    <radialGradient id="skinHighlightB" cx="0.5" cy="0.3" r="0.7">
      <stop offset="0%" stop-color="#fff1d6" stop-opacity="0.5"/>
      <stop offset="60%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="softShadowB" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity="0.15"/>
    </filter>
    <filter id="muscleShadowB">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1" flood-color="#6b3a1a" flood-opacity="0.25"/>
    </filter>
    <linearGradient id="backGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#d99a6c"/>
      <stop offset="100%" stop-color="#a87040"/>
    </linearGradient>
    <linearGradient id="trapGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e0a06e"/>
      <stop offset="100%" stop-color="#b07444"/>
    </linearGradient>
    <linearGradient id="latGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#cf8e60"/>
      <stop offset="100%" stop-color="#9c6436"/>
    </linearGradient>
    <linearGradient id="triGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#d99a6c"/>
      <stop offset="100%" stop-color="#ae7044"/>
    </linearGradient>
    <linearGradient id="hamGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#d09264"/>
      <stop offset="100%" stop-color="#a66a3c"/>
    </linearGradient>
    <linearGradient id="gluteGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#cc8a5c"/>
      <stop offset="100%" stop-color="#9c6034"/>
    </linearGradient>
    <linearGradient id="calfGradB" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#da9a6c"/>
      <stop offset="100%" stop-color="#a87040"/>
    </linearGradient>
  </defs>

  <!-- 皮肤层 -->
  <g class="skin-layer">
    <ellipse cx="200" cy="62" rx="38" ry="45" fill="url(#skinGradB)" filter="url(#softShadowB)"/>
    <path d="M175 92 Q200 102 225 92 Q215 102 200 104 Q185 102 175 92Z" fill="#d9b082"/>
    <path d="M182 108 L180 138 Q200 146 220 138 L218 108 Z" fill="url(#skinGradB)"/>
    
    <!-- 躯干背 -->
    <path d="
      M140 145
      C128 160 122 185 122 215
      C122 260 128 305 136 340
      C144 370 146 395 142 425
      C138 448 140 465 148 478
      L160 478
      C145 500 138 525 142 555
      C144 575 152 595 162 610
      L162 625
      L238 625
      L238 610
      C248 595 256 575 258 555
      C262 525 255 500 240 478
      L252 478
      C260 465 262 448 258 425
      C254 395 256 370 264 340
      C272 305 278 260 278 215
      C278 185 272 160 260 145
      C240 138 200 132 200 132
      C200 132 160 138 140 145Z
    " fill="url(#skinGradB)"/>
    
    <!-- 上臂 背 -->
    <path d="
      M115 148
      C100 152 90 168 84 192
      C76 230 74 270 80 305
      C85 328 95 345 106 358
      C114 348 118 332 118 315
      C116 280 118 242 124 210
      C126 188 128 168 128 155Z
    " fill="url(#skinGradB)" filter="url(#softShadowB)"/>
    <path d="
      M285 148
      C300 152 310 168 316 192
      C324 230 326 270 320 305
      C315 328 305 345 294 358
      C286 348 282 332 282 315
      C284 280 282 242 276 210
      C274 188 272 168 272 155Z
    " fill="url(#skinGradB)" filter="url(#softShadowB)"/>
    
    <!-- 前臂 背 -->
    <path d="
      M106 358
      C98 375 90 400 86 428
      C84 455 88 478 96 498
      C108 500 118 490 122 475
      C120 448 120 422 118 398
      C116 380 112 368 106 358Z
    " fill="url(#skinGradB)" filter="url(#softShadowB)"/>
    <path d="
      M294 358
      C302 375 310 400 314 428
      C316 455 312 478 304 498
      C292 500 282 490 278 475
      C280 448 280 422 282 398
      C284 380 288 368 294 358Z
    " fill="url(#skinGradB)" filter="url(#softShadowB)"/>
    
    <ellipse cx="95" cy="505" rx="14" ry="18" fill="url(#skinGradB)" filter="url(#softShadowB)"/>
    <ellipse cx="305" cy="505" rx="14" ry="18" fill="url(#skinGradB)" filter="url(#softShadowB)"/>
    
    <!-- 腰臀 背 -->
    <path d="
      M160 478
      C150 492 142 512 142 542
      C144 572 152 595 162 612
      L238 612
      C248 595 256 572 258 542
      C258 512 250 492 240 478Z
    " fill="url(#skinGradB)"/>
    
    <!-- 大腿 背 -->
    <path d="
      M162 610
      C154 632 148 665 146 700
      C146 728 152 752 162 770
      L186 770
      C188 738 190 705 190 675
      C190 645 192 628 192 610Z
    " fill="url(#skinGradB)" filter="url(#softShadowB)"/>
    <path d="
      M238 610
      C246 632 252 665 254 700
      C254 728 248 752 238 770
      L214 770
      C212 738 210 705 210 675
      C210 645 208 628 208 610Z
    " fill="url(#skinGradB)" filter="url(#softShadowB)"/>
    
    <!-- 小腿 背 -->
    <path d="
      M162 768
      C155 788 150 805 150 802
      L186 802
      C188 790 188 778 186 768Z
    " fill="url(#skinGradB)" filter="url(#softShadowB)"/>
    <path d="
      M238 768
      C245 788 250 805 250 802
      L214 802
      C212 790 212 778 214 768Z
    " fill="url(#skinGradB)" filter="url(#softShadowB)"/>
    
    <ellipse cx="168" cy="810" rx="22" ry="8" fill="#d9b082" filter="url(#softShadowB)"/>
    <ellipse cx="232" cy="810" rx="22" ry="8" fill="#d9b082" filter="url(#softShadowB)"/>
    
    <ellipse cx="200" cy="280" rx="65" ry="180" fill="url(#skinHighlightB)" opacity="0.6"/>
  </g>

  <!-- 肌肉层 背 -->
  <g class="muscle-layer">
    <!-- 斜方肌（大菱形） -->
    <path data-muscle="斜方肌" class="muscle-path" d="
      M200 108
      C168 112 140 128 122 160
      C150 170 180 168 200 162
      C220 168 250 170 278 160
      C260 128 232 112 200 108Z
    " fill="url(#trapGrad)" filter="url(#muscleShadowB)"/>
    <!-- 斜方肌延伸到中背 -->
    <path data-muscle="斜方肌" class="muscle-path" d="
      M130 220
      C150 200 180 190 200 188
      C220 190 250 200 270 220
      C260 250 235 262 200 258
      C165 262 140 250 130 220Z
    " fill="url(#trapGrad)" filter="url(#muscleShadowB)" opacity="0.9"/>
    
    <!-- 三角肌后束 左 -->
    <path data-muscle="三角肌" class="muscle-path" d="
      M118 160
      C104 168 96 188 98 210
      C108 222 124 222 132 208
      C132 188 130 172 128 162Z
    " fill="url(#triGrad)" filter="url(#muscleShadowB)"/>
    <!-- 三角肌后束 右 -->
    <path data-muscle="三角肌" class="muscle-path" d="
      M282 160
      C296 168 304 188 302 210
      C292 222 276 222 268 208
      C268 188 270 172 272 162Z
    " fill="url(#triGrad)" filter="url(#muscleShadowB)"/>
    
    <!-- 背阔肌 左 -->
    <path data-muscle="背阔肌" class="muscle-path" d="
      M128 255
      C116 280 108 320 112 365
      C125 385 148 390 170 375
      C178 345 180 318 178 295
      C172 278 158 265 140 258Z
    " fill="url(#latGrad)" filter="url(#muscleShadowB)"/>
    <!-- 背阔肌 右 -->
    <path data-muscle="背阔肌" class="muscle-path" d="
      M272 255
      C284 280 292 320 288 365
      C275 385 252 390 230 375
      C222 345 220 318 222 295
      C228 278 242 265 260 258Z
    " fill="url(#latGrad)" filter="url(#muscleShadowB)"/>
    
    <!-- 中背部（菱形肌区域） -->
    <path data-muscle="中背部" class="muscle-path" d="
      M168 258
      C180 248 192 245 200 245
      C208 245 220 248 232 258
      C230 288 220 310 200 315
      C180 310 170 288 168 258Z
    " fill="url(#backGrad)" filter="url(#muscleShadowB)"/>
    
    <!-- 胸椎竖脊肌 -->
    <g data-muscle="下背部" class="muscle-path">
      <ellipse cx="190" cy="370" rx="8" ry="45" fill="url(#backGrad)" filter="url(#muscleShadowB)"/>
      <ellipse cx="210" cy="370" rx="8" ry="45" fill="url(#backGrad)" filter="url(#muscleShadowB)"/>
      <ellipse cx="190" cy="425" rx="10" ry="25" fill="url(#latGrad)" filter="url(#muscleShadowB)"/>
      <ellipse cx="210" cy="425" rx="10" ry="25" fill="url(#latGrad)" filter="url(#muscleShadowB)"/>
    </g>
    
    <!-- 肱三头肌 左 -->
    <path data-muscle="肱三头肌" class="muscle-path" d="
      M88 222
      C82 240 80 268 84 295
      C94 302 106 298 110 286
      C108 265 108 248 106 232Z
    " fill="url(#triGrad)" filter="url(#muscleShadowB)"/>
    <!-- 肱三头肌 右 -->
    <path data-muscle="肱三头肌" class="muscle-path" d="
      M312 222
      C318 240 320 268 316 295
      C306 302 294 298 290 286
      C292 265 292 248 294 232Z
    " fill="url(#triGrad)" filter="url(#muscleShadowB)"/>
    
    <!-- 前臂伸肌 左 -->
    <path data-muscle="前臂肌群" class="muscle-path" d="
      M100 360
      C92 380 88 405 88 432
      C94 445 108 444 114 430
      C114 405 114 385 112 368Z
    " fill="url(#triGrad)" filter="url(#muscleShadowB)" opacity="0.85"/>
    <!-- 前臂伸肌 右 -->
    <path data-muscle="前臂肌群" class="muscle-path" d="
      M300 360
      C308 380 312 405 312 432
      C306 445 292 444 286 430
      C286 405 286 385 288 368Z
    " fill="url(#triGrad)" filter="url(#muscleShadowB)" opacity="0.85"/>
    
    <!-- 臀大肌 左 -->
    <path data-muscle="臀大肌" class="muscle-path" d="
      M150 540
      C140 560 140 582 148 600
      C168 608 188 595 196 578
      C192 565 180 552 160 544Z
    " fill="url(#gluteGrad)" filter="url(#muscleShadowB)"/>
    <!-- 臀大肌 右 -->
    <path data-muscle="臀大肌" class="muscle-path" d="
      M250 540
      C260 560 260 582 252 600
      C232 608 212 595 204 578
      C208 565 220 552 240 544Z
    " fill="url(#gluteGrad)" filter="url(#muscleShadowB)"/>
    
    <!-- 腘绳肌 左 -->
    <path data-muscle="腘绳肌" class="muscle-path" d="
      M164 618
      C156 645 152 678 152 708
      C156 735 166 755 182 765
      C186 735 188 705 188 678
      C188 650 188 635 188 620Z
    " fill="url(#hamGrad)" filter="url(#muscleShadowB)"/>
    <!-- 腘绳肌 右 -->
    <path data-muscle="腘绳肌" class="muscle-path" d="
      M236 618
      C244 645 248 678 248 708
      C244 735 234 755 218 765
      C214 735 212 705 212 678
      C212 650 212 635 212 620Z
    " fill="url(#hamGrad)" filter="url(#muscleShadowB)"/>
    
    <!-- 小腿肌群（腓肠肌） 左 -->
    <path data-muscle="小腿肌群" class="muscle-path" d="
      M162 770
      C155 792 152 805 152 802
      L186 802
      C184 788 178 775 170 768Z
    " fill="url(#calfGradB)" filter="url(#muscleShadowB)"/>
    <ellipse data-muscle="小腿肌群" class="muscle-path" cx="170" cy="782" rx="13" ry="14" fill="url(#calfGradB)" filter="url(#muscleShadowB)"/>
    <!-- 小腿肌群 右 -->
    <path data-muscle="小腿肌群" class="muscle-path" d="
      M238 770
      C245 792 248 805 248 802
      L214 802
      C216 788 222 775 230 768Z
    " fill="url(#calfGradB)" filter="url(#muscleShadowB)"/>
    <ellipse data-muscle="小腿肌群" class="muscle-path" cx="230" cy="782" rx="13" ry="14" fill="url(#calfGradB)" filter="url(#muscleShadowB)"/>
  </g>
</svg>'''

# ==================== CSS样式 ====================
css_code = '''
        /* ====== 方案二：2D SVG + CSS 3D ====== */
        .body-3d-container {
            width: 100%;
            height: 600px;
            position: relative;
            perspective: 1400px;
            perspective-origin: 50% 50%;
            background: radial-gradient(ellipse at 50% 35%, #1a2332 0%, #0d1117 60%, #080b10 100%);
            border-radius: 12px;
            overflow: hidden;
            cursor: grab;
            user-select: none;
        }
        .body-3d-container:active {
            cursor: grabbing;
        }
        
        /* 身体卡片容器（负责3D翻转+视差） */
        .body-card {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            transform-style: preserve-3d;
            transition: transform 0.12s ease-out;
            will-change: transform;
        }
        
        /* 正面/背面平面 */
        .body-face {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
            padding: 10px;
            box-sizing: border-box;
        }
        .body-face.front { z-index: 2; }
        .body-face.back {
            transform: rotateY(180deg);
            z-index: 1;
        }
        
        /* SVG */
        .body-svg {
            width: auto;
            height: 100%;
            max-height: 100%;
            filter: drop-shadow(0 8px 20px rgba(0,0,0,0.4));
            transition: filter 0.3s ease;
        }
        .body-3d-container:hover .body-svg {
            filter: drop-shadow(0 12px 28px rgba(0,0,0,0.5));
        }
        
        /* 肌肉路径 */
        .muscle-path {
            cursor: pointer;
            transition: fill 0.25s ease, filter 0.25s ease, opacity 0.25s ease;
            pointer-events: auto;
        }
        /* 悬停 */
        .muscle-hover {
            fill: #ff8c42 !important;
            filter: drop-shadow(0 0 6px rgba(255,140,66,0.6)) brightness(1.1);
        }
        g.muscle-path.muscle-hover > * {
            fill: #ff8c42 !important;
            filter: drop-shadow(0 0 6px rgba(255,140,66,0.6)) brightness(1.1);
        }
        /* 选中 */
        .muscle-selected {
            fill: #ffa500 !important;
            filter: drop-shadow(0 0 10px rgba(255,165,0,0.75)) brightness(1.15);
        }
        g.muscle-path.muscle-selected > * {
            fill: #ffa500 !important;
            filter: drop-shadow(0 0 10px rgba(255,165,0,0.75)) brightness(1.15);
        }
        
        /* 视图切换按钮 */
        .view-toggle {
            position: absolute;
            top: 12px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10;
            display: flex;
            background: rgba(0,0,0,0.55);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 4px;
            gap: 2px;
            border: 1px solid rgba(255,255,255,0.08);
        }
        .view-toggle button {
            background: transparent;
            border: none;
            color: #8899aa;
            padding: 6px 16px;
            border-radius: 16px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.2s ease;
            font-family: inherit;
        }
        .view-toggle button:hover {
            color: #ccd5df;
        }
        .view-toggle button.active {
            background: linear-gradient(135deg, #ff7b3a, #ff5722);
            color: white;
            box-shadow: 0 2px 10px rgba(255,90,35,0.35);
        }
        
        /* 提示文字 */
        .controls-hint {
            position: absolute;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            color: rgba(255,255,255,0.5);
            font-size: 11px;
            z-index: 10;
            background: rgba(0,0,0,0.35);
            padding: 5px 12px;
            border-radius: 12px;
            backdrop-filter: blur(5px);
            white-space: nowrap;
        }
        
        /* 角落装饰光 */
        .corner-glow {
            position: absolute;
            width: 260px;
            height: 260px;
            border-radius: 50%;
            filter: blur(80px);
            opacity: 0.3;
            pointer-events: none;
            z-index: 0;
        }
        .corner-glow.tl { top: -80px; left: -80px; background: #ff6b35; }
        .corner-glow.br { bottom: -80px; right: -80px; background: #3a7bd5; }
        
        /* Tooltip */
        .muscle-tooltip {
            position: fixed;
            z-index: 9999;
            background: linear-gradient(135deg, #1f2937, #111827);
            color: #fff;
            padding: 6px 14px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.15s ease;
            border: 1px solid rgba(255,255,255,0.08);
            box-shadow: 0 8px 24px rgba(0,0,0,0.5);
            transform: translate(-50%, -100%);
            white-space: nowrap;
        }
        .muscle-tooltip.visible { opacity: 1; }
        .muscle-tooltip::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 5px solid transparent;
            border-top-color: #1f2937;
        }
'''

# ==================== JS交互 ====================
js_code = '''
        // ============ 方案二：2D肌肉SVG + CSS 3D交互 ============
        let currentView = 'front';  // front / back
        let isDragging = false;
        let dragStartX = 0;
        let cardRotX = 0;
        let cardRotY = 0;
        let targetRotX = 0;
        let targetRotY = 0;
        let autoRotate = true;
        let autoRotDir = 1;
        let selectedMuscleName = null;
        let lastViewToggleClick = 0;
        
        function init3DBody() {
            const container = document.getElementById('body-3d-container');
            if (!container) return;
            
            // 清空容器
            container.innerHTML = '';
            
            // 创建结构
            container.innerHTML = `
                <div class="corner-glow tl"></div>
                <div class="corner-glow br"></div>
                <div class="view-toggle">
                    <button class="active" data-view="front">● 正面</button>
                    <button data-view="back">● 背面</button>
                </div>
                <div class="body-card" id="body-card">
                    <div class="body-face front" id="face-front"></div>
                    <div class="body-face back" id="face-back"></div>
                </div>
                <div class="controls-hint">🖱️ 拖动旋转视角 · 切换正/背面 · 点击肌肉选择</div>
            `;
            
            // 注入SVG
            document.getElementById('face-front').innerHTML = SVG_FRONT;
            document.getElementById('face-back').innerHTML = SVG_BACK;
            
            const card = document.getElementById('body-card');
            const tooltip = document.getElementById('muscle-tooltip');
            
            // 视图切换按钮
            document.querySelectorAll('.view-toggle button').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const view = btn.dataset.view;
                    if (view === currentView) return;
                    currentView = view;
                    autoRotate = false;
                    
                    document.querySelectorAll('.view-toggle button').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    // 翻转动画
                    if (view === 'back') {
                        targetRotY = 180;
                    } else {
                        targetRotY = 0;
                    }
                    // 重置X方向
                    targetRotX = 0;
                    lastViewToggleClick = Date.now();
                });
            });
            
            // ====== 肌肉交互：正面 ======
            bindMuscleEvents('#face-front', tooltip);
            
            // ====== 肌肉交互：背面 ======
            bindMuscleEvents('#face-back', tooltip);
            
            // ====== 拖动旋转 ======
            container.addEventListener('mousedown', (e) => {
                if (e.target.closest('.view-toggle') || e.target.closest('.view-toggle button')) return;
                if (e.target.closest('.muscle-path')) return; // 点肌肉时不拖动
                isDragging = true;
                autoRotate = false;
                dragStartX = e.clientX;
                dragStartY = e.clientY;
                startRotX = targetRotX;
                startRotY = targetRotY;
            });
            
            let dragStartY = 0;
            let startRotX = 0;
            let startRotY = 0;
            
            window.addEventListener('mousemove', (e) => {
                const tooltip = document.getElementById('muscle-tooltip');
                if (isDragging) {
                    const dx = e.clientX - dragStartX;
                    const dy = e.clientY - dragStartY;
                    // 如果是正面视角，拖动方向正常；背面视角则反向
                    const flip = currentView === 'back' ? -1 : 1;
                    targetRotY = startRotY + flip * dx * 0.4;
                    targetRotX = Math.max(-25, Math.min(25, startRotX - dy * 0.25));
                }
            });
            
            window.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    // 1.5秒后如果没操作，恢复自转
                    setTimeout(() => {
                        if (!isDragging) autoRotate = true;
                    }, 2500);
                }
            });
            
            // 鼠标离开容器
            container.addEventListener('mouseleave', () => {
                tooltip.classList.remove('visible');
                // 悬停样式恢复
                if (!selectedMuscleName) {
                    document.querySelectorAll('.muscle-path.muscle-hover').forEach(el => el.classList.remove('muscle-hover'));
                } else {
                    document.querySelectorAll('.muscle-path').forEach(el => {
                        if (el.dataset.muscle !== selectedMuscleName) {
                            el.classList.remove('muscle-hover');
                        }
                    });
                }
            });
            
            // ====== 动画循环 ======
            function tick() {
                if (autoRotate && !isDragging) {
                    // 微小的自转，让图有呼吸感
                    if (currentView === 'front') {
                        targetRotY += 0.08 * autoRotDir;
                        if (targetRotY > 12) autoRotDir = -1;
                        if (targetRotY < -12) autoRotDir = 1;
                    } else {
                        // 背面基准180度
                        const baseOffset = targetRotY - 180;
                        targetRotY = 180 + baseOffset + 0.08 * autoRotDir;
                        if (baseOffset > 12) autoRotDir = -1;
                        if (baseOffset < -12) autoRotDir = 1;
                    }
                }
                
                // 平滑插值
                cardRotX += (targetRotX - cardRotX) * 0.12;
                cardRotY += (targetRotY - cardRotY) * 0.12;
                
                card.style.transform = `rotateX(${cardRotX}deg) rotateY(${cardRotY}deg)`;
                
                requestAnimationFrame(tick);
            }
            tick();
        }
        
        function bindMuscleEvents(faceSelector, tooltip) {
            const face = document.querySelector(faceSelector);
            if (!face) return;
            
            const allMuscles = face.querySelectorAll('[data-muscle]');
            
            allMuscles.forEach(el => {
                el.addEventListener('mouseenter', (e) => {
                    const name = el.dataset.muscle;
                    
                    // 同组所有肌肉一起高亮
                    document.querySelectorAll(`${faceSelector} [data-muscle="${name}"]`).forEach(m => {
                        if (m.dataset.muscle !== selectedMuscleName) {
                            m.classList.add('muscle-hover');
                        }
                    });
                    
                    document.body.style.cursor = 'pointer';
                });
                
                el.addEventListener('mouseleave', (e) => {
                    const name = el.dataset.muscle;
                    if (name !== selectedMuscleName) {
                        document.querySelectorAll(`${faceSelector} [data-muscle="${name}"]`).forEach(m => {
                            m.classList.remove('muscle-hover');
                        });
                    }
                    document.body.style.cursor = 'default';
                });
                
                el.addEventListener('mousemove', (e) => {
                    tooltip.textContent = el.dataset.muscle;
                    tooltip.style.left = e.clientX + 'px';
                    tooltip.style.top = (e.clientY - 14) + 'px';
                    tooltip.classList.add('visible');
                });
                
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const name = el.dataset.muscle;
                    selectMuscleByName(name);
                });
            });
        }
        
        function selectMuscleByName(name) {
            // 清除之前选中的
            if (selectedMuscleName) {
                document.querySelectorAll(`[data-muscle="${selectedMuscleName}"]`).forEach(m => {
                    m.classList.remove('muscle-selected');
                });
            }
            
            selectedMuscleName = name;
            
            // 选中高亮（正背面都亮）
            document.querySelectorAll(`[data-muscle="${name}"]`).forEach(m => {
                m.classList.add('muscle-selected');
                m.classList.remove('muscle-hover');
            });
            
            // 调用原有API
            selectMuscle(name, null);
        }
'''

with open('svg_front.svg', 'w', encoding='utf-8') as f:
    f.write(svg_front)
with open('svg_back.svg', 'w', encoding='utf-8') as f:
    f.write(svg_back)

print(f"SVG正面: {len(svg_front)} 字符")
print(f"SVG背面: {len(svg_back)} 字符")
print(f"CSS: {len(css_code)} 字符")
print(f"JS: {len(js_code)} 字符")
