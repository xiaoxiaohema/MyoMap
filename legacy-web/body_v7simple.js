
        // ============ 3D人体 V7 - 2D肌肉图 + 3D交互版 ============
        let scene, camera, renderer, controls;
        let bodyGroup;
        let muscleHotspots = [];
        let raycaster, mouse;
        let hoveredMuscle = null;
        let selectedMuscle3D = null;
        let targetRotation = 0;
        let mouseNDC = new THREE.Vector2();
        
        const frontMuscles = [
            { name: '胸大肌', x: -0.38, y: 1.8, w: 0.55, h: 0.65 },
            { name: '胸大肌', x: 0.38, y: 1.8, w: 0.55, h: 0.65 },
            { name: '腹直肌', x: 0, y: 0.9, w: 0.5, h: 1.5 },
            { name: '腹外斜肌', x: -0.55, y: 0.7, w: 0.35, h: 1.3 },
            { name: '腹外斜肌', x: 0.55, y: 0.7, w: 0.35, h: 1.3 },
            { name: '三角肌', x: -0.88, y: 2.5, w: 0.38, h: 0.5 },
            { name: '三角肌', x: 0.88, y: 2.5, w: 0.38, h: 0.5 },
            { name: '肱二头肌', x: -1.0, y: 1.4, w: 0.28, h: 0.75 },
            { name: '肱二头肌', x: 1.0, y: 1.4, w: 0.28, h: 0.75 },
            { name: '肱三头肌', x: -1.05, y: 1.35, w: 0.25, h: 0.7 },
            { name: '肱三头肌', x: 1.05, y: 1.35, w: 0.25, h: 0.7 },
            { name: '前臂肌群', x: -0.95, y: 0.2, w: 0.28, h: 0.8 },
            { name: '前臂肌群', x: 0.95, y: 0.2, w: 0.28, h: 0.8 },
            { name: '股四头肌', x: -0.42, y: -1.6, w: 0.4, h: 1.6 },
            { name: '股四头肌', x: 0.42, y: -1.6, w: 0.4, h: 1.6 },
            { name: '腘绳肌', x: -0.5, y: -1.7, w: 0.3, h: 1.3 },
            { name: '腘绳肌', x: 0.5, y: -1.7, w: 0.3, h: 1.3 },
            { name: '臀大肌', x: -0.38, y: -0.35, w: 0.38, h: 0.45 },
            { name: '臀大肌', x: 0.38, y: -0.35, w: 0.38, h: 0.45 },
            { name: '小腿肌群', x: -0.38, y: -3.1, w: 0.3, h: 1.0 },
            { name: '小腿肌群', x: 0.38, y: -3.1, w: 0.3, h: 1.0 },
            { name: '斜方肌', x: -0.55, y: 2.9, w: 0.4, h: 0.5 },
            { name: '斜方肌', x: 0.55, y: 2.9, w: 0.4, h: 0.5 },
        ];
        
        const backMuscles = [
            { name: '斜方肌', x: -0.5, y: 2.9, w: 0.45, h: 0.7 },
            { name: '斜方肌', x: 0.5, y: 2.9, w: 0.45, h: 0.7 },
            { name: '背阔肌', x: -0.6, y: 1.3, w: 0.5, h: 1.6 },
            { name: '背阔肌', x: 0.6, y: 1.3, w: 0.5, h: 1.6 },
            { name: '中背部', x: 0, y: 1.5, w: 0.35, h: 0.9 },
            { name: '下背部', x: 0, y: 0.2, w: 0.35, h: 0.5 },
            { name: '三角肌', x: -0.85, y: 2.4, w: 0.35, h: 0.45 },
            { name: '三角肌', x: 0.85, y: 2.4, w: 0.35, h: 0.45 },
            { name: '肱三头肌', x: -1.0, y: 1.3, w: 0.28, h: 0.7 },
            { name: '肱三头肌', x: 1.0, y: 1.3, w: 0.28, h: 0.7 },
            { name: '前臂肌群', x: -0.92, y: 0.25, w: 0.26, h: 0.75 },
            { name: '前臂肌群', x: 0.92, y: 0.25, w: 0.26, h: 0.75 },
            { name: '臀大肌', x: -0.4, y: -0.4, w: 0.42, h: 0.5 },
            { name: '臀大肌', x: 0.4, y: -0.4, w: 0.42, h: 0.5 },
            { name: '腘绳肌', x: -0.42, y: -1.65, w: 0.38, h: 1.4 },
            { name: '腘绳肌', x: 0.42, y: -1.65, w: 0.38, h: 1.4 },
            { name: '小腿肌群', x: -0.38, y: -3.1, w: 0.3, h: 1.0 },
            { name: '小腿肌群', x: 0.38, y: -3.1, w: 0.3, h: 1.0 },
        ];
        
        function init3DBody() {
            const container = document.getElementById('body-3d-container');
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x0d1117);
            
            camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
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
            controls.maxDistance = 18;
            controls.target.set(0, 0, 0);
            controls.maxPolarAngle = Math.PI * 0.65;
            controls.minPolarAngle = Math.PI * 0.35;
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.5;
            
            const ambient = new THREE.AmbientLight(0xffffff, 0.8);
            scene.add(ambient);
            
            const keyLight = new THREE.DirectionalLight(0xfff0e0, 0.6);
            keyLight.position.set(3, 4, 5);
            scene.add(keyLight);
            
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
            const glowGeo = new THREE.CircleGeometry(4.5, 48);
            const glowMat = new THREE.MeshBasicMaterial({
                color: 0xff6633, transparent: true, opacity: 0.06,
                side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.position.z = -1.5;
            bodyGroup.add(glow);
            
            const bodyWidth = 3.0;
            const bodyHeight = 6.0;
            
            // 用PlaneGeometry创建人体板（简化版本，避免CylinderGeometry的UV问题）
            const frontCanvas = createBodyCanvas('front');
            const frontTex = new THREE.CanvasTexture(frontCanvas);
            
            const planeGeo = new THREE.PlaneGeometry(bodyWidth, bodyHeight, 12, 1);
            // 给平面添加一些弯曲（通过顶点位置）
            const positions = planeGeo.attributes.position;
            for (let i = 0; i < positions.count; i++) {
                const x = positions.getX(i);
                const zBend = Math.cos((x / bodyWidth) * Math.PI * 0.8) * 0.4 - 0.4;
                positions.setZ(i, zBend);
            }
            planeGeo.computeVertexNormals();
            
            const frontMat = new THREE.MeshStandardMaterial({
                map: frontTex, transparent: true, side: THREE.DoubleSide,
                roughness: 0.7, metalness: 0.05
            });
            const bodyFront = new THREE.Mesh(planeGeo, frontMat);
            bodyFront.name = 'bodyFront';
            bodyGroup.add(bodyFront);
            
            // 背面
            const backCanvas = createBodyCanvas('back');
            const backTex = new THREE.CanvasTexture(backCanvas);
            const backMat = new THREE.MeshStandardMaterial({
                map: backTex, transparent: true, side: THREE.DoubleSide,
                roughness: 0.7, metalness: 0.05
            });
            const bodyBack = new THREE.Mesh(planeGeo.clone(), backMat);
            bodyBack.rotation.y = Math.PI;
            bodyBack.position.z = -0.02;
            bodyBack.name = 'bodyBack';
            bodyGroup.add(bodyBack);
            
            // 侧边（薄的厚度）
            const sideGeo = new THREE.PlaneGeometry(0.05, bodyHeight);
            const sideMat = new THREE.MeshStandardMaterial({
                color: 0x1a1f2e, roughness: 0.5, metalness: 0.2, side: THREE.DoubleSide
            });
            for (let side of [-1, 1]) {
                const sideMesh = new THREE.Mesh(sideGeo, sideMat);
                sideMesh.position.x = side * bodyWidth / 2;
                sideMesh.position.z = side > 0 ? -0.2 : -0.2;
                sideMesh.rotation.y = Math.PI / 2;
                bodyGroup.add(sideMesh);
            }
            
            // 正面肌肉热点
            frontMuscles.forEach(function(m) {
                const hotspot = createMuscleHotspot(m, 'front');
                bodyGroup.add(hotspot);
            });
            
            // 背面肌肉热点
            backMuscles.forEach(function(m) {
                const hotspot = createMuscleHotspot(m, 'back');
                bodyGroup.add(hotspot);
            });
            
            // 浮动粒子
            const particleCount = 20;
            const pGeo = new THREE.BufferGeometry();
            const pPos = new Float32Array(particleCount * 3);
            for (let i = 0; i < particleCount; i++) {
                pPos[i * 3] = (Math.random() - 0.5) * 8;
                pPos[i * 3 + 1] = (Math.random() - 0.5) * 8;
                pPos[i * 3 + 2] = (Math.random() - 0.5) * 3 - 1;
            }
            pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
            const pMat = new THREE.PointsMaterial({
                color: 0xff8844, size: 0.04, transparent: true, opacity: 0.35,
                blending: THREE.AdditiveBlending, sizeAttenuation: true
            });
            const particles = new THREE.Points(pGeo, pMat);
            particles.name = 'particles';
            bodyGroup.add(particles);
            
            scene.add(bodyGroup);
        }
        
        function createMuscleHotspot(muscleData, view) {
            const w = muscleData.w;
            const h = muscleData.h;
            const x = muscleData.x;
            const y = muscleData.y;
            
            // 使用PlaneGeometry作为热点
            const geo = new THREE.PlaneGeometry(w, h);
            const zOffset = view === 'front' ? 0.05 : -0.05;
            
            const mat = new THREE.MeshStandardMaterial({
                color: 0xff6633, transparent: true, opacity: 0,
                emissive: 0xff6633, emissiveIntensity: 0,
                side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
            });
            
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, y, zOffset);
            
            mesh.userData.muscle = muscleData.name;
            mesh.userData.isMuscle = true;
            mesh.userData.view = view;
            mesh.userData.hoverOpacity = 0.35;
            mesh.userData.selectedOpacity = 0.55;
            mesh.userData.hoverEmissive = 0.7;
            mesh.userData.selectedEmissive = 1.1;
            
            muscleHotspots.push(mesh);
            return mesh;
        }
        
        function createBodyCanvas(view) {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 1024;
            const ctx = canvas.getContext('2d');
            drawStylizedBody(ctx, 256, 512, view);
            return canvas;
        }
        
        function drawStylizedBody(ctx, cx, cy, view) {
            ctx.save();
            
            const skinLight = '#e8c4a0';
            const skinMid = '#d4ae88';
            const skinDark = '#be976c';
            const muscLight = '#d89868';
            const muscMid = '#c48454';
            const muscDark = '#a66e3e';
            const muscDeep = '#8a5a32';
            
            function fillBodyGrad(base, shadow) {
                const g = ctx.createLinearGradient(cx - 120, 0, cx + 120, 0);
                g.addColorStop(0, shadow);
                g.addColorStop(0.3, base);
                g.addColorStop(0.5, skinLight);
                g.addColorStop(0.7, base);
                g.addColorStop(1, shadow);
                return g;
            }
            
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            
            // 头部
            const headY = cy - 380;
            ctx.fillStyle = fillBodyGrad(skinMid, skinDark);
            ctx.beginPath();
            ctx.ellipse(cx, headY, 55, 68, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // 颈部
            ctx.fillStyle = fillBodyGrad(skinDark, muscDeep);
            ctx.beginPath();
            ctx.moveTo(cx - 22, headY + 85);
            ctx.lineTo(cx - 28, headY + 145);
            ctx.lineTo(cx + 28, headY + 145);
            ctx.lineTo(cx + 22, headY + 85);
            ctx.closePath();
            ctx.fill();
            
            // 躯干
            ctx.fillStyle = fillBodyGrad(skinMid, skinDark);
            ctx.beginPath();
            ctx.moveTo(cx - 65, headY + 145);
            ctx.quadraticCurveTo(cx - 85, headY + 220, cx - 60, headY + 300);
            ctx.lineTo(cx - 55, headY + 400);
            ctx.quadraticCurveTo(cx - 65, headY + 425, cx - 55, headY + 450);
            ctx.lineTo(cx - 50, headY + 480);
            ctx.lineTo(cx + 50, headY + 480);
            ctx.lineTo(cx + 55, headY + 450);
            ctx.quadraticCurveTo(cx + 65, headY + 425, cx + 55, headY + 400);
            ctx.lineTo(cx + 60, headY + 300);
            ctx.quadraticCurveTo(cx + 85, headY + 220, cx + 65, headY + 145);
            ctx.closePath();
            ctx.fill();
            
            if (view === 'front') {
                // 胸大肌
                for (var s of [-1, 1]) {
                    ctx.save();
                    ctx.translate(cx + s * 5, headY + 200);
                    ctx.beginPath();
                    ctx.ellipse(s * 45, 0, 50, 38, s * 0.15, 0, Math.PI * 2);
                    var cg = ctx.createRadialGradient(s * 35, -10, 5, s * 45, 0, 50);
                    cg.addColorStop(0, muscLight);
                    cg.addColorStop(0.6, muscMid);
                    cg.addColorStop(1, muscDark);
                    ctx.fillStyle = cg;
                    ctx.fill();
                    ctx.restore();
                }
                
                // 腹肌
                var ag = ctx.createLinearGradient(cx - 40, 0, cx + 40, 0);
                ag.addColorStop(0, muscDark);
                ag.addColorStop(0.4, muscLight);
                ag.addColorStop(0.6, muscLight);
                ag.addColorStop(1, muscDark);
                ctx.fillStyle = ag;
                for (var i = 0; i < 4; i++) {
                    var yy = headY + 275 + i * 38;
                    ctx.beginPath();
                    ctx.ellipse(cx - 22, yy, 20, 15, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.ellipse(cx + 22, yy, 20, 15, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // 腹白线
                ctx.strokeStyle = muscDeep;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx, headY + 255);
                ctx.lineTo(cx, headY + 405);
                ctx.stroke();
                
                // 腹外斜肌
                ctx.fillStyle = muscDark;
                for (s of [-1, 1]) {
                    for (i = 0; i < 3; i++) {
                        var y2 = headY + 270 + i * 40;
                        ctx.beginPath();
                        ctx.ellipse(cx + s * 62, y2, 18, 26, s * 0.3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            } else {
                // 背视图
                // 斜方肌
                ctx.fillStyle = muscDark;
                ctx.beginPath();
                ctx.moveTo(cx - 70, headY + 140);
                ctx.quadraticCurveTo(cx, headY + 105, cx + 70, headY + 140);
                ctx.lineTo(cx + 55, headY + 215);
                ctx.quadraticCurveTo(cx, headY + 230, cx - 55, headY + 215);
                ctx.closePath();
                ctx.fill();
                
                var tg = ctx.createLinearGradient(cx - 60, 0, cx + 60, 0);
                tg.addColorStop(0, muscDeep);
                tg.addColorStop(0.5, muscLight);
                tg.addColorStop(1, muscDeep);
                ctx.fillStyle = tg;
                ctx.globalAlpha = 0.6;
                ctx.fill();
                ctx.globalAlpha = 1;
                
                // 背阔肌
                ctx.fillStyle = muscDeep;
                for (s of [-1, 1]) {
                    ctx.beginPath();
                    ctx.moveTo(cx + s * 50, headY + 210);
                    ctx.quadraticCurveTo(cx + s * 85, headY + 270, cx + s * 75, headY + 370);
                    ctx.quadraticCurveTo(cx + s * 55, headY + 340, cx + s * 35, headY + 240);
                    ctx.closePath();
                    ctx.fill();
                }
                
                // 脊柱沟
                ctx.strokeStyle = muscDeep;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx, headY + 160);
                ctx.lineTo(cx, headY + 410);
                ctx.stroke();
                
                // 中背部
                ctx.fillStyle = muscDark;
                ctx.globalAlpha = 0.7;
                ctx.beginPath();
                ctx.ellipse(cx, headY + 290, 30, 55, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
                
                // 下背部
                ctx.fillStyle = muscDeep;
                ctx.beginPath();
                ctx.ellipse(cx, headY + 395, 30, 32, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // 肩部
            for (s of [-1, 1]) {
                var sx = cx + s * 85;
                var sy = headY + 180;
                
                // 三角肌
                ctx.beginPath();
                ctx.ellipse(sx, sy, 32, 28, s * 0.1, 0, Math.PI * 2);
                var dg = ctx.createRadialGradient(sx - s * 10, sy - 5, 5, sx, sy, 32);
                dg.addColorStop(0, muscLight);
                dg.addColorStop(0.7, muscMid);
                dg.addColorStop(1, muscDark);
                ctx.fillStyle = dg;
                ctx.fill();
                
                // 上臂
                ctx.fillStyle = fillBodyGrad(skinMid, skinDark);
                ctx.beginPath();
                ctx.ellipse(sx + s * 5, sy + 95, 22, 75, s * 0.05, 0, Math.PI * 2);
                ctx.fill();
                
                // 二/三头肌
                ctx.fillStyle = (view === 'front') ? muscMid : muscDark;
                ctx.beginPath();
                ctx.ellipse(sx + s * 8, sy + 95, 16, 55, s * 0.08, 0, Math.PI * 2);
                ctx.fill();
                
                // 肘部
                ctx.fillStyle = skinDark;
                ctx.beginPath();
                ctx.arc(sx + s * 8, sy + 175, 18, 0, Math.PI * 2);
                ctx.fill();
                
                // 前臂
                ctx.fillStyle = fillBodyGrad(skinDark, muscDeep);
                ctx.beginPath();
                ctx.ellipse(sx + s * 3, sy + 248, 19, 65, s * 0.03, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // 髋部
            ctx.fillStyle = muscDark;
            ctx.beginPath();
            ctx.ellipse(cx, headY + 430, 65, 28, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // 臀部
            ctx.fillStyle = (view === 'back') ? muscDark : muscDeep;
            for (s of [-1, 1]) {
                ctx.beginPath();
                ctx.ellipse(cx + s * 35, headY + 450, 36, 30, s * 0.2, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // 大腿
            for (s of [-1, 1]) {
                var tx = cx + s * 35;
                var ty = headY + 535;
                
                ctx.fillStyle = fillBodyGrad(skinMid, skinDark);
                ctx.beginPath();
                ctx.ellipse(tx, ty, 30, 100, s * 0.03, 0, Math.PI * 2);
                ctx.fill();
                
                // 股四头肌/腘绳肌
                ctx.fillStyle = (view === 'front') ? muscMid : muscDark;
                ctx.beginPath();
                ctx.ellipse(tx + s * 2, ty, 22, 80, s * 0.05, 0, Math.PI * 2);
                ctx.fill();
                
                if (view === 'front') {
                    // 股外侧肌
                    ctx.fillStyle = muscLight;
                    ctx.globalAlpha = 0.65;
                    ctx.beginPath();
                    ctx.ellipse(tx + s * 22, ty, 8, 70, s * 0.1, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }
            }
            
            // 膝盖
            for (s of [-1, 1]) {
                ctx.fillStyle = skinDark;
                ctx.beginPath();
                ctx.ellipse(cx + s * 35, headY + 650, 22, 18, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // 小腿
            for (s of [-1, 1]) {
                var cax = cx + s * 33;
                var cay = headY + 745;
                
                ctx.fillStyle = fillBodyGrad(skinDark, muscDeep);
                ctx.beginPath();
                ctx.ellipse(cax, cay, 20, 85, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // 小腿肚
                ctx.fillStyle = muscMid;
                ctx.globalAlpha = (view === 'back') ? 1 : 0.6;
                ctx.beginPath();
                ctx.ellipse(cax, cay - 10, 18, 55, 0, 0, Math.PI * 2);
                ctx.fill();
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
                        mat.emissive.setHex(0xff6633);
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
                    var tX = mouseNDC.x * 0.12;
                    var tY = mouseNDC.y * 0.08;
                    bodyGroup.rotation.x += (tY - bodyGroup.rotation.x) * 0.03;
                }
            }
            
            var particles = bodyGroup ? bodyGroup.getObjectByName('particles') : null;
            if (particles) {
                particles.rotation.y += 0.001;
            }
            
            controls.update();
            renderer.render(scene, camera);
        }
