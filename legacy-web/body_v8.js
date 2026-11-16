
        // ============ 3D人体 V8 - MuscleWiki风格3D交互版 ============
        let scene, camera, renderer, controls;
        let bodyGroup;
        let muscleHotspots = [];
        let raycaster, mouse;
        let hoveredMuscle = null;
        let selectedMuscle3D = null;
        let targetRotation = 0;
        let mouseNDC = new THREE.Vector2();
        
        // 肌肉区域坐标经过重新校准，匹配新的人体比例
        const frontMuscles = [
            { name: '胸大肌', x: -0.4, y: 1.7, w: 0.55, h: 0.6 },
            { name: '胸大肌', x: 0.4, y: 1.7, w: 0.55, h: 0.6 },
            { name: '腹直肌', x: 0, y: 0.8, w: 0.45, h: 1.4 },
            { name: '腹外斜肌', x: -0.55, y: 0.6, w: 0.32, h: 1.3 },
            { name: '腹外斜肌', x: 0.55, y: 0.6, w: 0.32, h: 1.3 },
            { name: '三角肌', x: -0.88, y: 2.4, w: 0.36, h: 0.48 },
            { name: '三角肌', x: 0.88, y: 2.4, w: 0.36, h: 0.48 },
            { name: '肱二头肌', x: -1.0, y: 1.3, w: 0.26, h: 0.7 },
            { name: '肱二头肌', x: 1.0, y: 1.3, w: 0.26, h: 0.7 },
            { name: '肱三头肌', x: -1.05, y: 1.25, w: 0.24, h: 0.65 },
            { name: '肱三头肌', x: 1.05, y: 1.25, w: 0.24, h: 0.65 },
            { name: '前臂肌群', x: -0.95, y: 0.15, w: 0.26, h: 0.75 },
            { name: '前臂肌群', x: 0.95, y: 0.15, w: 0.26, h: 0.75 },
            { name: '股四头肌', x: -0.4, y: -1.8, w: 0.38, h: 1.5 },
            { name: '股四头肌', x: 0.4, y: -1.8, w: 0.38, h: 1.5 },
            { name: '臀大肌', x: -0.38, y: -0.4, w: 0.36, h: 0.42 },
            { name: '臀大肌', x: 0.38, y: -0.4, w: 0.36, h: 0.42 },
            { name: '小腿肌群', x: -0.36, y: -3.3, w: 0.28, h: 0.95 },
            { name: '小腿肌群', x: 0.36, y: -3.3, w: 0.28, h: 0.95 },
            { name: '斜方肌', x: -0.55, y: 2.8, w: 0.38, h: 0.45 },
            { name: '斜方肌', x: 0.55, y: 2.8, w: 0.38, h: 0.45 },
        ];
        
        const backMuscles = [
            { name: '斜方肌', x: -0.5, y: 2.8, w: 0.42, h: 0.65 },
            { name: '斜方肌', x: 0.5, y: 2.8, w: 0.42, h: 0.65 },
            { name: '背阔肌', x: -0.6, y: 1.3, w: 0.48, h: 1.5 },
            { name: '背阔肌', x: 0.6, y: 1.3, w: 0.48, h: 1.5 },
            { name: '中背部', x: 0, y: 1.4, w: 0.32, h: 0.85 },
            { name: '下背部', x: 0, y: 0.15, w: 0.32, h: 0.48 },
            { name: '三角肌', x: -0.85, y: 2.3, w: 0.34, h: 0.44 },
            { name: '三角肌', x: 0.85, y: 2.3, w: 0.34, h: 0.44 },
            { name: '肱三头肌', x: -1.0, y: 1.2, w: 0.26, h: 0.65 },
            { name: '肱三头肌', x: 1.0, y: 1.2, w: 0.26, h: 0.65 },
            { name: '前臂肌群', x: -0.92, y: 0.18, w: 0.24, h: 0.7 },
            { name: '前臂肌群', x: 0.92, y: 0.18, w: 0.24, h: 0.7 },
            { name: '臀大肌', x: -0.4, y: -0.45, w: 0.4, h: 0.48 },
            { name: '臀大肌', x: 0.4, y: -0.45, w: 0.4, h: 0.48 },
            { name: '腘绳肌', x: -0.4, y: -1.85, w: 0.36, h: 1.35 },
            { name: '腘绳肌', x: 0.4, y: -1.85, w: 0.36, h: 1.35 },
            { name: '小腿肌群', x: -0.36, y: -3.3, w: 0.28, h: 0.95 },
            { name: '小腿肌群', x: 0.36, y: -3.3, w: 0.28, h: 0.95 },
        ];
        
        function init3DBody() {
            var container = document.getElementById('body-3d-container');
            var width = container.clientWidth;
            var height = container.clientHeight;
            
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x0e141e);
            
            camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
            camera.position.set(0, 0, 10);
            
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            container.insertBefore(renderer.domElement, container.firstChild);
            
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.08;
            controls.enablePan = false;
            controls.minDistance = 7;
            controls.maxDistance = 16;
            controls.target.set(0, 0, 0);
            controls.maxPolarAngle = Math.PI * 0.62;
            controls.minPolarAngle = Math.PI * 0.38;
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.6;
            
            // 光照 - 更柔和的风格
            var ambient = new THREE.AmbientLight(0xffffff, 0.85);
            scene.add(ambient);
            
            var keyLight = new THREE.DirectionalLight(0xffffff, 0.5);
            keyLight.position.set(3, 5, 5);
            scene.add(keyLight);
            
            var warmLight = new THREE.DirectionalLight(0xffaa66, 0.25);
            warmLight.position.set(-2, 3, -3);
            scene.add(warmLight);
            
            raycaster = new THREE.Raycaster();
            mouse = new THREE.Vector2();
            
            createBody();
            
            renderer.domElement.addEventListener('mousemove', onMouseMove);
            renderer.domElement.addEventListener('click', onMouseClick);
            renderer.domElement.addEventListener('mouseleave', onMouseLeave);
            window.addEventListener('resize', onWindowResize);
            
            renderer.domElement.addEventListener('mouseenter', function() { controls.autoRotate = false; });
            renderer.domElement.addEventListener('mouseleave', function() { controls.autoRotate = true; });
            
            animate();
        }
        
        function createBody() {
            bodyGroup = new THREE.Group();
            
            // 背景光晕
            var glowGeo = new THREE.CircleGeometry(4.8, 48);
            var glowMat = new THREE.MeshBasicMaterial({
                color: 0xff7744, transparent: true, opacity: 0.08,
                side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
            });
            var glow = new THREE.Mesh(glowGeo, glowMat);
            glow.position.z = -1.6;
            bodyGroup.add(glow);
            
            var bodyWidth = 2.8;
            var bodyHeight = 6.2;
            
            // 带弯曲的人体面板
            var planeGeo = new THREE.PlaneGeometry(bodyWidth, bodyHeight, 10, 1);
            var positions = planeGeo.attributes.position;
            for (var i = 0; i < positions.count; i++) {
                var px = positions.getX(i);
                var bend = Math.cos((px / bodyWidth) * Math.PI * 0.85) * 0.5 - 0.5;
                positions.setZ(i, bend);
            }
            planeGeo.computeVertexNormals();
            
            // 正面
            var frontCanvas = createBodyCanvas('front');
            var frontTex = new THREE.CanvasTexture(frontCanvas);
            var frontMat = new THREE.MeshStandardMaterial({
                map: frontTex, transparent: true, side: THREE.DoubleSide,
                roughness: 0.75, metalness: 0.03
            });
            var bodyFront = new THREE.Mesh(planeGeo, frontMat);
            bodyGroup.add(bodyFront);
            
            // 背面
            var backCanvas = createBodyCanvas('back');
            var backTex = new THREE.CanvasTexture(backCanvas);
            var backMat = new THREE.MeshStandardMaterial({
                map: backTex, transparent: true, side: THREE.DoubleSide,
                roughness: 0.75, metalness: 0.03
            });
            var bodyBack = new THREE.Mesh(planeGeo.clone(), backMat);
            bodyBack.rotation.y = Math.PI;
            bodyBack.position.z = -0.02;
            bodyGroup.add(bodyBack);
            
            // 肌肉热点
            frontMuscles.forEach(function(m) {
                bodyGroup.add(createMuscleHotspot(m, 'front'));
            });
            backMuscles.forEach(function(m) {
                bodyGroup.add(createMuscleHotspot(m, 'back'));
            });
            
            // 浮动粒子
            var pCount = 25;
            var pGeo = new THREE.BufferGeometry();
            var pPos = new Float32Array(pCount * 3);
            for (var i = 0; i < pCount; i++) {
                pPos[i * 3] = (Math.random() - 0.5) * 8;
                pPos[i * 3 + 1] = (Math.random() - 0.5) * 8;
                pPos[i * 3 + 2] = (Math.random() - 0.5) * 3 - 1;
            }
            pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
            var pMat = new THREE.PointsMaterial({
                color: 0xff9966, size: 0.035, transparent: true, opacity: 0.4,
                blending: THREE.AdditiveBlending, sizeAttenuation: true
            });
            var particles = new THREE.Points(pGeo, pMat);
            particles.name = 'particles';
            bodyGroup.add(particles);
            
            scene.add(bodyGroup);
        }
        
        function createMuscleHotspot(md, view) {
            var geo = new THREE.PlaneGeometry(md.w, md.h);
            var zOff = view === 'front' ? 0.06 : -0.06;
            
            var mat = new THREE.MeshStandardMaterial({
                color: 0xff7744, transparent: true, opacity: 0,
                emissive: 0xff7744, emissiveIntensity: 0,
                side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
            });
            
            var mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(md.x, md.y, zOff);
            mesh.userData.muscle = md.name;
            mesh.userData.view = view;
            mesh.userData.hoverOpacity = 0.32;
            mesh.userData.selectedOpacity = 0.55;
            mesh.userData.hoverEmissive = 0.65;
            mesh.userData.selectedEmissive = 1.1;
            muscleHotspots.push(mesh);
            return mesh;
        }
        
        function createBodyCanvas(view) {
            var canvas = document.createElement('canvas');
            canvas.width = 480;
            canvas.height = 960;
            var ctx = canvas.getContext('2d');
            drawCleanBody(ctx, 240, 480, view);
            return canvas;
        }
        
        function drawCleanBody(ctx, cx, cy, view) {
            ctx.save();
            ctx.clearRect(0, 0, 480, 960);
            
            // ===== MuscleWiki风格的清爽配色 =====
            var base = '#e8c8a8';       // 皮肤基础色
            var midTone = '#d6b08a';    // 皮肤中间
            var shadow = '#b88e66';     // 阴影
            var deepShadow = '#967048'; // 深阴影
            var mL = '#dd9e6e';         // 肌肉亮
            var mM = '#c48652';         // 肌肉中
            var mD = '#a46a3c';         // 肌肉暗
            var mDD = '#7f5028';        // 肌肉最深
            var lineCol = 'rgba(80, 50, 20, 0.55)';  // 肌肉线条
            
            function linGrad(x0, y0, x1, y1, stops) {
                var g = ctx.createLinearGradient(x0, y0, x1, y1);
                stops.forEach(function(s) { g.addColorStop(s[0], s[1]); });
                return g;
            }
            
            function radGrad(x0, y0, r0, x1, y1, r1, stops) {
                var g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
                stops.forEach(function(s) { g.addColorStop(s[0], s[1]); });
                return g;
            }
            
            function strokePath(w, col) {
                ctx.lineWidth = w;
                ctx.strokeStyle = col;
                ctx.stroke();
            }
            
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            
            // 头部（更简约的风格）
            var headY = cy - 360;
            ctx.fillStyle = linGrad(cx - 50, 0, cx + 50, 0, [
                [0, shadow], [0.35, midTone], [0.5, base], [0.65, midTone], [1, shadow]
            ]);
            ctx.beginPath();
            ctx.ellipse(cx, headY, 48, 58, 0, 0, Math.PI * 2);
            ctx.fill();
            strokePath(1, lineCol);
            
            // 脖子
            ctx.fillStyle = linGrad(cx - 25, 0, cx + 25, 0, [
                [0, shadow], [0.5, midTone], [1, shadow]
            ]);
            ctx.beginPath();
            ctx.moveTo(cx - 20, headY + 72);
            ctx.quadraticCurveTo(cx - 26, headY + 100, cx - 24, headY + 130);
            ctx.lineTo(cx + 24, headY + 130);
            ctx.quadraticCurveTo(cx + 26, headY + 100, cx + 20, headY + 72);
            ctx.closePath();
            ctx.fill();
            strokePath(1, lineCol);
            
            // ============ 躯干 ============
            ctx.fillStyle = linGrad(cx - 70, 0, cx + 70, 0, [
                [0, shadow], [0.3, midTone], [0.5, base], [0.7, midTone], [1, shadow]
            ]);
            ctx.beginPath();
            ctx.moveTo(cx - 55, headY + 130);
            ctx.quadraticCurveTo(cx - 72, headY + 180, cx - 78, headY + 225);
            ctx.quadraticCurveTo(cx - 74, headY + 260, cx - 58, headY + 290);
            ctx.lineTo(cx - 52, headY + 375);
            ctx.quadraticCurveTo(cx - 56, headY + 395, cx - 50, headY + 420);
            ctx.quadraticCurveTo(cx - 54, headY + 440, cx - 48, headY + 458);
            ctx.lineTo(cx + 48, headY + 458);
            ctx.quadraticCurveTo(cx + 54, headY + 440, cx + 50, headY + 420);
            ctx.quadraticCurveTo(cx + 56, headY + 395, cx + 52, headY + 375);
            ctx.lineTo(cx + 58, headY + 290);
            ctx.quadraticCurveTo(cx + 74, headY + 260, cx + 78, headY + 225);
            ctx.quadraticCurveTo(cx + 72, headY + 180, cx + 55, headY + 130);
            ctx.closePath();
            ctx.fill();
            strokePath(1.2, lineCol);
            
            if (view === 'front') {
                // ========== 正面肌肉 ==========
                // --- 锁骨 ---
                ctx.strokeStyle = 'rgba(60, 40, 20, 0.45)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(cx - 48, headY + 142);
                ctx.quadraticCurveTo(cx, headY + 158, cx + 48, headY + 142);
                ctx.stroke();
                
                // --- 胸大肌 ---
                for (var s of [-1, 1]) {
                    ctx.save();
                    ctx.translate(cx, headY + 195);
                    var cx1 = s * 38, cy1 = -5;
                    var g1 = radGrad(cx1 - s * 10, cy1 - 8, 4, cx1, cy1, 48, [
                        [0, '#e8b080'], [0.35, mM], [0.75, mD], [1, mDD]
                    ]);
                    ctx.fillStyle = g1;
                    ctx.beginPath();
                    ctx.moveTo(s * 8, -32);
                    ctx.bezierCurveTo(s * 30, -38, s * 55, -25, s * 52, 0);
                    ctx.bezierCurveTo(s * 50, 18, s * 35, 32, s * 10, 28);
                    ctx.bezierCurveTo(s * 18, 0, s * 15, -15, s * 8, -32);
                    ctx.closePath();
                    ctx.fill();
                    strokePath(1.2, lineCol);
                    ctx.restore();
                }
                
                // --- 腹肌 ---
                var ag = linGrad(cx - 35, 0, cx + 35, 0, [
                    [0, mD], [0.3, mL], [0.5, mM], [0.7, mL], [1, mD]
                ]);
                ctx.fillStyle = ag;
                for (var i = 0; i < 4; i++) {
                    var yy = headY + 268 + i * 34;
                    ctx.beginPath();
                    ctx.ellipse(cx - 18, yy, 17, 12, 0, 0, Math.PI * 2);
                    ctx.fill();
                    strokePath(1, lineCol);
                    ctx.beginPath();
                    ctx.ellipse(cx + 18, yy, 17, 12, 0, 0, Math.PI * 2);
                    ctx.fill();
                    strokePath(1, lineCol);
                }
                
                // --- 腹白线 ---
                ctx.strokeStyle = 'rgba(70, 45, 20, 0.6)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(cx, headY + 250);
                ctx.lineTo(cx, headY + 395);
                ctx.stroke();
                
                // --- 腹肌横膈线 ---
                for (i = 0; i < 3; i++) {
                    var yy2 = headY + 285 + i * 34;
                    ctx.beginPath();
                    ctx.moveTo(cx - 32, yy2);
                    ctx.lineTo(cx + 32, yy2);
                    ctx.stroke();
                }
                
                // --- 腹外斜肌 ---
                for (s of [-1, 1]) {
                    ctx.fillStyle = radGrad(cx + s * 50, headY + 310, 5, cx + s * 55, headY + 310, 30, [
                        [0, mM], [0.6, mD], [1, mDD]
                    ]);
                    for (i = 0; i < 3; i++) {
                        var y3 = headY + 260 + i * 36;
                        ctx.beginPath();
                        ctx.ellipse(cx + s * 55, y3, 14, 22, s * 0.35, 0, Math.PI * 2);
                        ctx.fill();
                        strokePath(0.8, lineCol);
                    }
                }
            } else {
                // ========== 背面肌肉 ==========
                // --- 斜方肌 ---
                ctx.fillStyle = radGrad(cx, headY + 185, 10, cx, headY + 185, 70, [
                    [0, mL], [0.4, mM], [0.75, mD], [1, mDD]
                ]);
                ctx.beginPath();
                ctx.moveTo(cx - 60, headY + 130);
                ctx.quadraticCurveTo(cx, headY + 95, cx + 60, headY + 130);
                ctx.quadraticCurveTo(cx + 50, headY + 170, cx + 48, headY + 205);
                ctx.quadraticCurveTo(cx, headY + 230, cx - 48, headY + 205);
                ctx.quadraticCurveTo(cx - 50, headY + 170, cx - 60, headY + 130);
                ctx.closePath();
                ctx.fill();
                strokePath(1.2, lineCol);
                
                // --- 背阔肌 ---
                for (s of [-1, 1]) {
                    ctx.save();
                    ctx.translate(cx + s * 5, headY + 270);
                    var g2 = radGrad(s * 5, 0, 10, s * 15, 20, 70, [
                        [0, mL], [0.5, mD], [1, mDD]
                    ]);
                    ctx.fillStyle = g2;
                    ctx.beginPath();
                    ctx.moveTo(s * 30, -55);
                    ctx.bezierCurveTo(s * 60, -20, s * 68, 50, s * 50, 105);
                    ctx.bezierCurveTo(s * 35, 85, s * 25, 40, s * 15, 0);
                    ctx.bezierCurveTo(s * 20, -25, s * 25, -40, s * 30, -55);
                    ctx.closePath();
                    ctx.fill();
                    strokePath(1, lineCol);
                    ctx.restore();
                }
                
                // --- 脊柱沟 ---
                ctx.strokeStyle = 'rgba(60, 40, 20, 0.55)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(cx, headY + 155);
                ctx.lineTo(cx, headY + 420);
                ctx.stroke();
                
                // --- 中背部（菱形肌/竖脊肌区域） ---
                ctx.fillStyle = radGrad(cx, headY + 270, 5, cx, headY + 270, 35, [
                    [0, mM], [0.7, mD], [1, mDD]
                ]);
                ctx.beginPath();
                ctx.ellipse(cx, headY + 270, 24, 48, 0, 0, Math.PI * 2);
                ctx.fill();
                strokePath(0.8, lineCol);
                
                // --- 下背部 ---
                ctx.fillStyle = radGrad(cx, headY + 385, 5, cx, headY + 385, 30, [
                    [0, mD], [1, mDD]
                ]);
                ctx.beginPath();
                ctx.ellipse(cx, headY + 385, 26, 28, 0, 0, Math.PI * 2);
                ctx.fill();
                strokePath(0.8, lineCol);
            }
            
            // ========== 肩部（前后通用） ==========
            for (s of [-1, 1]) {
                var sx = cx + s * 78;
                var sy = headY + 180;
                
                ctx.fillStyle = radGrad(sx - s * 8, sy - 4, 3, sx, sy, 30, [
                    [0, mL], [0.5, mM], [1, mDD]
                ]);
                ctx.beginPath();
                ctx.moveTo(sx - s * 5, sy - 25);
                ctx.bezierCurveTo(sx + s * 22, sy - 28, sx + s * 30, sy, sx + s * 28, sy + 20);
                ctx.bezierCurveTo(sx + s * 20, sy + 28, sx + s * 2, sy + 26, sx - s * 5, sy + 20);
                ctx.bezierCurveTo(sx - s * 18, sy + 10, sx - s * 20, sy - 12, sx - s * 5, sy - 25);
                ctx.closePath();
                ctx.fill();
                strokePath(1.2, lineCol);
                
                // --- 上臂 ---
                var ax = sx + s * 5;
                var ay = sy + 85;
                ctx.fillStyle = linGrad(ax - 25, 0, ax + 25, 0, [
                    [0, deepShadow], [0.3, shadow], [0.5, midTone], [0.7, shadow], [1, deepShadow]
                ]);
                ctx.beginPath();
                ctx.ellipse(ax, ay, 20, 70, s * 0.08, 0, Math.PI * 2);
                ctx.fill();
                strokePath(1, lineCol);
                
                // 肌肉
                if (view === 'front') {
                    // 二头肌
                    ctx.fillStyle = radGrad(ax + s * 6, ay - 10, 4, ax + s * 8, ay, 20, [
                        [0, mL], [0.6, mM], [1, mD]
                    ]);
                    ctx.beginPath();
                    ctx.ellipse(ax + s * 8, ay, 13, 50, s * 0.1, 0, Math.PI * 2);
                    ctx.fill();
                    strokePath(0.8, lineCol);
                } else {
                    // 三头肌
                    ctx.fillStyle = radGrad(ax + s * 6, ay - 10, 4, ax + s * 8, ay, 20, [
                        [0, mM], [0.6, mD], [1, mDD]
                    ]);
                    ctx.beginPath();
                    ctx.ellipse(ax + s * 8, ay, 14, 52, s * 0.08, 0, Math.PI * 2);
                    ctx.fill();
                    strokePath(0.8, lineCol);
                }
                
                // --- 肘 ---
                ctx.fillStyle = shadow;
                ctx.beginPath();
                ctx.arc(ax + s * 5, ay + 60, 16, 0, Math.PI * 2);
                ctx.fill();
                strokePath(1, lineCol);
                
                // --- 前臂 ---
                var fx = ax + s * 3;
                var fy = ay + 128;
                ctx.fillStyle = linGrad(fx - 22, 0, fx + 22, 0, [
                    [0, deepShadow], [0.3, shadow], [0.5, midTone], [0.7, shadow], [1, deepShadow]
                ]);
                ctx.beginPath();
                ctx.ellipse(fx, fy, 17, 58, s * 0.05, 0, Math.PI * 2);
                ctx.fill();
                strokePath(1, lineCol);
            }
            
            // ========== 髋部 ==========
            ctx.fillStyle = linGrad(cx - 60, 0, cx + 60, 0, [
                [0, shadow], [0.5, midTone], [1, shadow]
            ]);
            ctx.beginPath();
            ctx.ellipse(cx, headY + 440, 58, 24, 0, 0, Math.PI * 2);
            ctx.fill();
            strokePath(1.2, lineCol);
            
            // ========== 臀部 ==========
            for (s of [-1, 1]) {
                var gx = cx + s * 32;
                var gy = headY + 458;
                ctx.fillStyle = radGrad(gx - s * 5, gy - 3, 4, gx, gy, 32, [
                    [0, (view === 'back') ? mM : mD],
                    [0.55, mD],
                    [1, mDD]
                ]);
                ctx.beginPath();
                ctx.ellipse(gx, gy, 32, 26, s * 0.22, 0, Math.PI * 2);
                ctx.fill();
                strokePath(1, lineCol);
            }
            
            // ========== 大腿 ==========
            for (s of [-1, 1]) {
                var tx = cx + s * 32;
                var ty = headY + 555;
                
                ctx.fillStyle = linGrad(tx - 28, 0, tx + 28, 0, [
                    [0, deepShadow], [0.3, shadow], [0.5, midTone], [0.7, shadow], [1, deepShadow]
                ]);
                ctx.beginPath();
                ctx.ellipse(tx, ty, 27, 95, s * 0.04, 0, Math.PI * 2);
                ctx.fill();
                strokePath(1, lineCol);
                
                if (view === 'front') {
                    // 股四头肌
                    ctx.fillStyle = radGrad(tx + s * 2, ty - 15, 8, tx + s * 5, ty, 28, [
                        [0, mL], [0.5, mM], [1, mD]
                    ]);
                    ctx.beginPath();
                    ctx.ellipse(tx + s * 4, ty, 19, 75, s * 0.06, 0, Math.PI * 2);
                    ctx.fill();
                    strokePath(0.8, lineCol);
                    
                    // 股外侧肌线条
                    ctx.fillStyle = 'rgba(255, 220, 180, 0.55)';
                    ctx.beginPath();
                    ctx.ellipse(tx + s * 20, ty, 6, 65, s * 0.12, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // 腘绳肌
                    ctx.fillStyle = radGrad(tx + s * 3, ty - 10, 8, tx + s * 5, ty, 28, [
                        [0, mM], [0.55, mD], [1, mDD]
                    ]);
                    ctx.beginPath();
                    ctx.ellipse(tx + s * 5, ty, 17, 72, s * 0.05, 0, Math.PI * 2);
                    ctx.fill();
                    strokePath(0.8, lineCol);
                }
            }
            
            // ========== 膝盖 ==========
            for (s of [-1, 1]) {
                ctx.fillStyle = shadow;
                ctx.beginPath();
                ctx.ellipse(cx + s * 32, headY + 665, 20, 16, 0, 0, Math.PI * 2);
                ctx.fill();
                strokePath(1, lineCol);
            }
            
            // ========== 小腿 ==========
            for (s of [-1, 1]) {
                var cax = cx + s * 30;
                var cay = headY + 760;
                
                ctx.fillStyle = linGrad(cax - 22, 0, cax + 22, 0, [
                    [0, deepShadow], [0.3, shadow], [0.5, midTone], [0.7, shadow], [1, deepShadow]
                ]);
                ctx.beginPath();
                ctx.ellipse(cax, cay, 18, 80, 0, 0, Math.PI * 2);
                ctx.fill();
                strokePath(1, lineCol);
                
                // 小腿肚
                ctx.fillStyle = radGrad(cax, cay - 5, 5, cax, cay, 22, [
                    [0, mL], [0.6, mM], [1, mD]
                ]);
                ctx.globalAlpha = (view === 'back') ? 1 : 0.7;
                ctx.beginPath();
                ctx.ellipse(cax, cay - 5, 15, 50, 0, 0, Math.PI * 2);
                ctx.fill();
                strokePath(0.8, lineCol);
                ctx.globalAlpha = 1;
            }
            
            ctx.restore();
        }
        
        function isFrontViewVisible() {
            if (!bodyGroup) return true;
            var rot = bodyGroup.rotation.y % (Math.PI * 2);
            if (rot < 0) rot += Math.PI * 2;
            return rot < Math.PI / 2 || rot > Math.PI * 3 / 2;
        }
        
        function onMouseMove(event) {
            var container = document.getElementById('body-3d-container');
            var rect = container.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            mouseNDC.copy(mouse);
            
            raycaster.setFromCamera(mouse, camera);
            var isFront = isFrontViewVisible();
            var visible = muscleHotspots.filter(function(h) {
                return isFront ? (h.userData.view === 'front') : (h.userData.view === 'back');
            });
            
            var intersects = raycaster.intersectObjects(visible);
            var tooltip = document.getElementById('muscle-tooltip');
            
            if (intersects.length > 0) {
                var mesh = intersects[0].object;
                var name = mesh.userData.muscle;
                
                if (hoveredMuscle !== mesh) {
                    if (hoveredMuscle && hoveredMuscle.userData.muscle !== selectedMuscle3D) {
                        setMuscleHighlight(hoveredMuscle.userData.muscle, false, false);
                    }
                    hoveredMuscle = mesh;
                    if (name !== selectedMuscle3D) {
                        setMuscleHighlight(name, true, false);
                    }
                    document.body.style.cursor = 'pointer';
                }
                
                tooltip.textContent = name;
                tooltip.style.left = event.clientX + 'px';
                tooltip.style.top = (event.clientY - 12) + 'px';
                tooltip.classList.add('visible');
            } else {
                if (hoveredMuscle && hoveredMuscle.userData.muscle !== selectedMuscle3D) {
                    setMuscleHighlight(hoveredMuscle.userData.muscle, false, false);
                }
                hoveredMuscle = null;
                document.body.style.cursor = 'default';
                tooltip.classList.remove('visible');
            }
        }
        
        function onMouseClick(event) {
            raycaster.setFromCamera(mouse, camera);
            var isFront = isFrontViewVisible();
            var visible = muscleHotspots.filter(function(h) {
                return isFront ? (h.userData.view === 'front') : (h.userData.view === 'back');
            });
            var intersects = raycaster.intersectObjects(visible);
            
            if (intersects.length > 0) {
                var name = intersects[0].object.userData.muscle;
                if (selectedMuscle3D === name) return;
                
                if (selectedMuscle3D) {
                    setMuscleHighlight(selectedMuscle3D, false, false);
                }
                selectedMuscle3D = name;
                setMuscleHighlight(name, true, true);
                selectMuscle(name, null);
            }
        }
        
        function onMouseLeave() {
            document.getElementById('muscle-tooltip').classList.remove('visible');
            if (hoveredMuscle && hoveredMuscle.userData.muscle !== selectedMuscle3D) {
                setMuscleHighlight(hoveredMuscle.userData.muscle, false, false);
            }
            hoveredMuscle = null;
            document.body.style.cursor = 'default';
        }
        
        function setMuscleHighlight(name, isActive, isSelected) {
            muscleHotspots.forEach(function(h) {
                if (h.userData.muscle === name) {
                    var mat = h.material;
                    if (isSelected) {
                        mat.opacity = h.userData.selectedOpacity;
                        mat.emissiveIntensity = h.userData.selectedEmissive;
                        mat.emissive.setHex(0xffaa33);
                    } else if (isActive) {
                        mat.opacity = h.userData.hoverOpacity;
                        mat.emissiveIntensity = h.userData.hoverEmissive;
                        mat.emissive.setHex(0xff7744);
                    } else {
                        mat.opacity = 0;
                        mat.emissiveIntensity = 0;
                    }
                    mat.needsUpdate = true;
                }
            });
        }
        
        function onWindowResize() {
            var container = document.getElementById('body-3d-container');
            if (!container || !camera || !renderer) return;
            var w = container.clientWidth;
            var h = container.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        }
        
        function animate() {
            requestAnimationFrame(animate);
            
            if (bodyGroup) {
                var diff = targetRotation - bodyGroup.rotation.y;
                if (Math.abs(diff) > 0.001) {
                    bodyGroup.rotation.y += diff * 0.08;
                }
                if (!controls.autoRotate) {
                    var tX = mouseNDC.x * 0.1;
                    var tY = mouseNDC.y * 0.06;
                    bodyGroup.rotation.x += (tY - bodyGroup.rotation.x) * 0.03;
                }
            }
            
            var particles = bodyGroup ? bodyGroup.getObjectByName('particles') : null;
            if (particles) {
                particles.rotation.y += 0.0008;
            }
            
            controls.update();
            renderer.render(scene, camera);
        }
