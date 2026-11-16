
        // ============ 3D人体模型 V4 - 自然精致版 ============
        let scene, camera, renderer, controls;
        let bodyGroup;
        let muscleMeshes = [];
        let raycaster, mouse;
        let hoveredMuscle = null;
        let selectedMuscle3D = null;
        
        function init3DBody() {
            const container = document.getElementById('body-3d-container');
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x0d1117);
            
            camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
            camera.position.set(0, 0.3, 15);
            
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            container.insertBefore(renderer.domElement, container.firstChild);
            
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.06;
            controls.enablePan = false;
            controls.minDistance = 9;
            controls.maxDistance = 32;
            controls.target.set(0, 0.3, 0);
            controls.maxPolarAngle = Math.PI * 0.93;
            controls.minPolarAngle = Math.PI * 0.07;
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.35;
            
            // ====== 光照系统 ======
            const ambient = new THREE.AmbientLight(0xfff0e0, 0.35);
            scene.add(ambient);
            
            const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.1);
            keyLight.position.set(4, 7, 5);
            keyLight.castShadow = true;
            keyLight.shadow.mapSize.width = 2048;
            keyLight.shadow.mapSize.height = 2048;
            keyLight.shadow.camera.near = 0.5;
            keyLight.shadow.camera.far = 50;
            keyLight.shadow.camera.left = -7;
            keyLight.shadow.camera.right = 7;
            keyLight.shadow.camera.top = 9;
            keyLight.shadow.camera.bottom = -9;
            scene.add(keyLight);
            
            const fillLight = new THREE.DirectionalLight(0x8899bb, 0.35);
            fillLight.position.set(-5, 3, -3);
            scene.add(fillLight);
            
            const rimLight = new THREE.DirectionalLight(0xffaa66, 0.45);
            rimLight.position.set(0, 4, -6);
            scene.add(rimLight);
            
            const bottomLight = new THREE.DirectionalLight(0x887766, 0.2);
            bottomLight.position.set(0, -5, 3);
            scene.add(bottomLight);
            
            const hemiLight = new THREE.HemisphereLight(0x99aabb, 0x554433, 0.25);
            scene.add(hemiLight);
            
            raycaster = new THREE.Raycaster();
            mouse = new THREE.Vector2();
            
            createBody();
            
            renderer.domElement.addEventListener('mousemove', onMouseMove);
            renderer.domElement.addEventListener('click', onMouseClick);
            renderer.domElement.addEventListener('mouseleave', onMouseLeave);
            window.addEventListener('resize', onWindowResize);
            
            renderer.domElement.addEventListener('mouseenter', () => { controls.autoRotate = false; });
            renderer.domElement.addEventListener('mouseleave', () => { controls.autoRotate = true; });
            
            animate();
        }
        
        function createBody() {
            bodyGroup = new THREE.Group();
            
            // ====== 材质色板 ======
            const skinC = {
                light: 0xf0d0b0,
                mid: 0xe2c19a,
                dark: 0xd0ae85,
                deep: 0xbe9a70
            };
            const muscleC = {
                light: 0xe8b890,
                mid: 0xd8a678,
                dark: 0xc69668,
                deep: 0xb08458
            };
            
            // 工具函数：创建椭球
            function makeEllipsoid(rx, ry, rz, mat, wSeg, hSeg) {
                wSeg = wSeg || 24;
                hSeg = hSeg || 20;
                const geo = new THREE.SphereGeometry(1, wSeg, hSeg);
                const mesh = new THREE.Mesh(geo, mat);
                mesh.scale.set(rx, ry, rz);
                mesh.castShadow = true;
                return mesh;
            }
            
            // 工具函数：创建皮肤材质
            function skinMat(level) {
                const colors = { light: skinC.light, mid: skinC.mid, dark: skinC.dark, deep: skinC.deep };
                return new THREE.MeshStandardMaterial({
                    color: colors[level] || skinC.mid,
                    roughness: 0.6,
                    metalness: 0.02
                });
            }
            
            // 工具函数：创建肌肉材质
            function muscleMat(level) {
                const colors = { light: muscleC.light, mid: muscleC.mid, dark: muscleC.dark, deep: muscleC.deep };
                const mat = new THREE.MeshStandardMaterial({
                    color: colors[level] || muscleC.mid,
                    roughness: 0.52,
                    metalness: 0.05
                });
                return mat;
            }
            
            // 工具函数：标记肌肉
            function markMuscle(mesh, name) {
                mesh.userData.muscle = name;
                mesh.userData.isMuscle = true;
                muscleMeshes.push(mesh);
            }
            
            // ====== 头部 ======
            const head = makeEllipsoid(0.78, 0.95, 0.82, skinMat('light'), 32, 28);
            head.position.set(0, 5.1, 0);
            bodyGroup.add(head);
            
            // 下颌
            const jaw = makeEllipsoid(0.55, 0.35, 0.48, skinMat('mid'), 24, 18);
            jaw.position.set(0, 4.55, 0.18);
            bodyGroup.add(jaw);
            
            // 颈部
            const neck = makeEllipsoid(0.35, 0.4, 0.36, skinMat('mid'), 20, 16);
            neck.position.set(0, 4.15, 0);
            neck.scale.y = 0.75;
            bodyGroup.add(neck);
            
            // ====== 躯干（用LatheGeometry） ======
            const torsoPoints = [];
            const torsoProfile = [
                [1.35, 3.8], [1.48, 3.4], [1.58, 3.0], [1.6, 2.6],
                [1.58, 2.2], [1.5, 1.8], [1.42, 1.4], [1.35, 1.0],
                [1.28, 0.6], [1.22, 0.2], [1.18, -0.2], [1.15, -0.6],
                [1.18, -1.0], [1.22, -1.3], [1.2, -1.6]
            ];
            for (let i = 0; i < torsoProfile.length; i++) {
                torsoPoints.push(new THREE.Vector2(torsoProfile[i][0], torsoProfile[i][1]));
            }
            const torsoGeo = new THREE.LatheGeometry(torsoPoints, 36);
            const torso = new THREE.Mesh(torsoGeo, skinMat('mid'));
            torso.scale.set(1, 1, 0.8);
            torso.castShadow = true;
            bodyGroup.add(torso);
            
            // ====== 胸大肌 ======
            const chestMat = muscleMat('mid');
            for (let side of [-1, 1]) {
                const chest = makeEllipsoid(0.72, 0.58, 0.42, chestMat.clone(), 24, 20);
                chest.position.set(side * 0.68, 2.95, 1.22);
                chest.scale.x *= side;
                chest.rotation.y = side * 0.35;
                chest.rotation.z = side * 0.08;
                markMuscle(chest, '胸大肌');
                bodyGroup.add(chest);
                
                // 胸肌上沿
                const chestUpper = makeEllipsoid(0.5, 0.35, 0.28, muscleMat('light').clone(), 20, 16);
                chestUpper.position.set(side * 0.55, 3.25, 1.15);
                chestUpper.scale.x *= side;
                chestUpper.rotation.y = side * 0.3;
                markMuscle(chestUpper, '胸大肌');
                bodyGroup.add(chestUpper);
            }
            
            // 胸肌中间缝
            const sternum = makeEllipsoid(0.1, 1.1, 0.08, skinMat('dark'), 12, 12);
            sternum.position.set(0, 2.8, 1.28);
            bodyGroup.add(sternum);
            
            // ====== 腹肌 ======
            const abMat = muscleMat('mid');
            for (let i = 0; i < 4; i++) {
                const ab = makeEllipsoid(0.55, 0.28, 0.22, abMat.clone(), 20, 14);
                ab.position.set(0, 2.25 - i * 0.48, 1.32);
                markMuscle(ab, '腹直肌');
                bodyGroup.add(ab);
            }
            
            // 腹白线
            const abLine = makeEllipsoid(0.05, 1.8, 0.04, skinMat('deep'), 10, 10);
            abLine.position.set(0, 1.53, 1.34);
            bodyGroup.add(abLine);
            
            // ====== 腹外斜肌 ======
            const oblMat = muscleMat('dark');
            for (let side of [-1, 1]) {
                for (let i = 0; i < 3; i++) {
                    const obl = makeEllipsoid(0.28, 0.42, 0.2, oblMat.clone(), 16, 14);
                    obl.position.set(side * 1.08, 2.05 - i * 0.52, 1.05);
                    obl.rotation.z = side * 0.3;
                    markMuscle(obl, '腹外斜肌');
                    bodyGroup.add(obl);
                }
                // 下部腹斜肌
                const lowerObl = makeEllipsoid(0.32, 0.5, 0.22, oblMat.clone(), 16, 14);
                lowerObl.position.set(side * 1.0, 0.6, 0.95);
                lowerObl.rotation.z = side * 0.2;
                markMuscle(lowerObl, '腹外斜肌');
                bodyGroup.add(lowerObl);
            }
            
            // ====== 斜方肌 ======
            const trapsMat = muscleMat('dark');
            
            // 上斜方（颈侧到肩）
            for (let side of [-1, 1]) {
                const upperTrap = makeEllipsoid(0.45, 0.7, 0.42, trapsMat.clone(), 20, 16);
                upperTrap.position.set(side * 0.95, 3.9, -0.1);
                upperTrap.rotation.z = side * 0.25;
                upperTrap.rotation.x = -0.1;
                markMuscle(upperTrap, '斜方肌');
                bodyGroup.add(upperTrap);
            }
            
            // 中斜方（中间连接）
            const midTrap = makeEllipsoid(0.9, 0.45, 0.3, muscleMat('deep').clone(), 24, 16);
            midTrap.position.set(0, 3.55, -0.75);
            midTrap.rotation.x = -0.2;
            markMuscle(midTrap, '斜方肌');
            bodyGroup.add(midTrap);
            
            // 下斜方
            const lowerTrap = makeEllipsoid(0.7, 0.6, 0.22, muscleMat('deep').clone(), 20, 16);
            lowerTrap.position.set(0, 2.6, -1.0);
            lowerTrap.rotation.x = -0.15;
            markMuscle(lowerTrap, '斜方肌');
            bodyGroup.add(lowerTrap);
            
            // ====== 肩部（三角肌） ======
            const deltMat = muscleMat('mid');
            for (let side of [-1, 1]) {
                // 前束
                const frontDelt = makeEllipsoid(0.38, 0.38, 0.4, deltMat.clone(), 20, 18);
                frontDelt.position.set(side * 1.65, 3.45, 0.45);
                frontDelt.rotation.y = side * 0.4;
                frontDelt.rotation.z = side * 0.1;
                markMuscle(frontDelt, '三角肌');
                bodyGroup.add(frontDelt);
                
                // 中束
                const sideDelt = makeEllipsoid(0.35, 0.45, 0.42, muscleMat('light').clone(), 20, 18);
                sideDelt.position.set(side * 1.85, 3.45, 0);
                sideDelt.rotation.z = side * 0.15;
                markMuscle(sideDelt, '三角肌');
                bodyGroup.add(sideDelt);
                
                // 后束
                const rearDelt = makeEllipsoid(0.32, 0.35, 0.38, muscleMat('dark').clone(), 20, 18);
                rearDelt.position.set(side * 1.65, 3.42, -0.4);
                rearDelt.rotation.y = side * -0.4;
                rearDelt.rotation.z = side * 0.08;
                markMuscle(rearDelt, '三角肌');
                bodyGroup.add(rearDelt);
            }
            
            // ====== 背部 - 背阔肌 ======
            const latMat = muscleMat('deep');
            for (let side of [-1, 1]) {
                // 背阔肌主体（大扇形）
                const lat = makeEllipsoid(0.55, 1.6, 0.25, latMat.clone(), 24, 20);
                lat.position.set(side * 0.75, 1.5, -1.05);
                lat.rotation.x = -0.1;
                lat.rotation.y = side * -0.25;
                lat.rotation.z = side * -0.15;
                markMuscle(lat, '背阔肌');
                bodyGroup.add(lat);
                
                // 背阔肌上部（靠近腋下）
                const latUpper = makeEllipsoid(0.35, 0.55, 0.22, muscleMat('dark').clone(), 18, 16);
                latUpper.position.set(side * 1.25, 2.7, -0.6);
                latUpper.rotation.y = side * -0.3;
                latUpper.rotation.z = side * 0.2;
                markMuscle(latUpper, '背阔肌');
                bodyGroup.add(latUpper);
            }
            
            // 中背部（菱形肌/竖脊肌区域）
            const midBack = makeEllipsoid(0.6, 0.9, 0.28, muscleMat('dark').clone(), 22, 18);
            midBack.position.set(0, 2.2, -1.15);
            midBack.rotation.x = -0.1;
            markMuscle(midBack, '中背部');
            bodyGroup.add(midBack);
            
            // 下背部
            const lowerBack = makeEllipsoid(0.5, 0.6, 0.25, muscleMat('deep').clone(), 20, 16);
            lowerBack.position.set(0, 0.5, -1.0);
            lowerBack.rotation.x = -0.05;
            markMuscle(lowerBack, '下背部');
            bodyGroup.add(lowerBack);
            
            // 脊柱沟
            const spineLine = makeEllipsoid(0.06, 3.0, 0.08, skinMat('deep'), 12, 24);
            spineLine.position.set(0, 2.0, -1.18);
            bodyGroup.add(spineLine);
            
            // ====== 上臂 ======
            for (let side of [-1, 1]) {
                // 上臂皮肤底层
                const upperArm = makeEllipsoid(0.3, 0.95, 0.32, skinMat('mid'), 22, 18);
                upperArm.position.set(side * 1.95, 2.3, 0);
                upperArm.rotation.z = side * 0.08;
                bodyGroup.add(upperArm);
                
                // 肱二头肌（长头）
                const bicepLong = makeEllipsoid(0.22, 0.65, 0.2, muscleMat('mid').clone(), 18, 14);
                bicepLong.position.set(side * 1.88, 2.35, 0.42);
                bicepLong.rotation.z = side * 0.1;
                bicepLong.rotation.x = -0.05;
                markMuscle(bicepLong, '肱二头肌');
                bodyGroup.add(bicepLong);
                
                // 肱二头肌（短头，内侧）
                const bicepShort = makeEllipsoid(0.18, 0.55, 0.18, muscleMat('light').clone(), 16, 14);
                bicepShort.position.set(side * 1.72, 2.38, 0.38);
                bicepShort.rotation.z = side * 0.15;
                markMuscle(bicepShort, '肱二头肌');
                bodyGroup.add(bicepShort);
                
                // 肱三头肌（外侧头）
                const tricepLat = makeEllipsoid(0.22, 0.7, 0.22, muscleMat('dark').clone(), 18, 14);
                tricepLat.position.set(side * 2.0, 2.28, -0.32);
                tricepLat.rotation.z = side * 0.05;
                tricepLat.rotation.x = 0.05;
                markMuscle(tricepLat, '肱三头肌');
                bodyGroup.add(tricepLat);
                
                // 肱三头肌（长头）
                const tricepLong = makeEllipsoid(0.2, 0.6, 0.2, muscleMat('deep').clone(), 16, 14);
                tricepLong.position.set(side * 1.85, 2.3, -0.38);
                tricepLong.rotation.z = side * 0.08;
                markMuscle(tricepLong, '肱三头肌');
                bodyGroup.add(tricepLong);
            }
            
            // ====== 前臂 ======
            for (let side of [-1, 1]) {
                // 前臂主体
                const forearm = makeEllipsoid(0.22, 0.75, 0.24, skinMat('dark'), 20, 16);
                forearm.position.set(side * 1.82, 0.7, 0.05);
                forearm.rotation.z = side * 0.05;
                markMuscle(forearm, '前臂肌群');
                bodyGroup.add(forearm);
                
                // 前臂屈肌（内侧）
                const forearmFlex = makeEllipsoid(0.15, 0.55, 0.15, muscleMat('dark').clone(), 14, 12);
                forearmFlex.position.set(side * 1.72, 0.65, 0.2);
                forearmFlex.rotation.z = side * 0.1;
                markMuscle(forearmFlex, '前臂肌群');
                bodyGroup.add(forearmFlex);
            }
            
            // ====== 臀部 ======
            const gluteMat = muscleMat('dark');
            for (let side of [-1, 1]) {
                const glute = makeEllipsoid(0.62, 0.55, 0.7, gluteMat.clone(), 24, 20);
                glute.position.set(side * 0.55, -0.75, -0.5);
                glute.rotation.x = -0.15;
                markMuscle(glute, '臀大肌');
                bodyGroup.add(glute);
            }
            
            // 髋部连接
            const hip = makeEllipsoid(0.85, 0.35, 0.55, skinMat('dark'), 24, 16);
            hip.position.set(0, -1.0, -0.2);
            bodyGroup.add(hip);
            
            // ====== 大腿 ======
            for (let side of [-1, 1]) {
                // 大腿主体
                const thigh = makeEllipsoid(0.42, 1.3, 0.4, skinMat('mid'), 24, 20);
                thigh.position.set(side * 0.52, -2.6, 0);
                bodyGroup.add(thigh);
                
                // 股四头肌 - 股直肌
                const rectusFem = makeEllipsoid(0.28, 1.0, 0.22, muscleMat('mid').clone(), 20, 16);
                rectusFem.position.set(side * 0.52, -2.6, 0.48);
                rectusFem.rotation.x = 0.05;
                markMuscle(rectusFem, '股四头肌');
                bodyGroup.add(rectusFem);
                
                // 股四头肌 - 股外侧肌
                const vastusLat = makeEllipsoid(0.2, 0.9, 0.18, muscleMat('light').clone(), 18, 14);
                vastusLat.position.set(side * 0.8, -2.65, 0.3);
                vastusLat.rotation.z = side * 0.1;
                markMuscle(vastusLat, '股四头肌');
                bodyGroup.add(vastusLat);
                
                // 股四头肌 - 股内侧肌（膝盖上方的水滴）
                const vastusMed = makeEllipsoid(0.18, 0.45, 0.15, muscleMat('light').clone(), 16, 12);
                vastusMed.position.set(side * 0.38, -3.5, 0.35);
                vastusMed.rotation.z = side * -0.15;
                markMuscle(vastusMed, '股四头肌');
                bodyGroup.add(vastusMed);
                
                // 腘绳肌 - 股二头肌
                const bicepFem = makeEllipsoid(0.25, 1.0, 0.2, muscleMat('dark').clone(), 18, 14);
                bicepFem.position.set(side * 0.58, -2.65, -0.42);
                bicepFem.rotation.x = -0.05;
                markMuscle(bicepFem, '腘绳肌');
                bodyGroup.add(bicepFem);
                
                // 内收肌（大腿内侧）
                const adductor = makeEllipsoid(0.2, 0.8, 0.18, muscleMat('deep').clone(), 16, 14);
                adductor.position.set(side * 0.3, -2.5, 0.2);
                adductor.rotation.z = side * -0.1;
                markMuscle(adductor, '内收肌群');
                bodyGroup.add(adductor);
            }
            
            // ====== 膝盖 ======
            for (let side of [-1, 1]) {
                const knee = makeEllipsoid(0.2, 0.18, 0.15, skinMat('dark'), 16, 12);
                knee.position.set(side * 0.52, -4.0, 0.35);
                bodyGroup.add(knee);
            }
            
            // ====== 小腿 ======
            for (let side of [-1, 1]) {
                // 胫骨前
                const shin = makeEllipsoid(0.2, 0.7, 0.18, skinMat('dark'), 18, 14);
                shin.position.set(side * 0.5, -5.0, 0.2);
                bodyGroup.add(shin);
                
                // 腓肠肌（小腿肚）
                const gastroc = makeEllipsoid(0.28, 0.6, 0.3, muscleMat('mid').clone(), 20, 16);
                gastroc.position.set(side * 0.5, -5.05, -0.2);
                gastroc.rotation.x = -0.1;
                markMuscle(gastroc, '小腿肌群');
                bodyGroup.add(gastroc);
                
                // 比目鱼肌
                const soleus = makeEllipsoid(0.22, 0.4, 0.22, muscleMat('dark').clone(), 16, 14);
                soleus.position.set(side * 0.5, -5.5, -0.15);
                soleus.rotation.x = -0.05;
                markMuscle(soleus, '小腿肌群');
                bodyGroup.add(soleus);
            }
            
            // 整体位置
            bodyGroup.position.y = 0.3;
            scene.add(bodyGroup);
        }
        
        function onMouseMove(event) {
            const container = document.getElementById('body-3d-container');
            const rect = container.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(muscleMeshes);
            const tooltip = document.getElementById('muscle-tooltip');
            
            if (intersects.length > 0) {
                const mesh = intersects[0].object;
                const name = mesh.userData.muscle;
                
                if (hoveredMuscle !== mesh) {
                    if (hoveredMuscle && hoveredMuscle.userData.muscle !== selectedMuscle3D) {
                        muscleMeshes.forEach(m => {
                            if (m.userData.muscle === hoveredMuscle.userData.muscle) {
                                setMuscleEmissive(m, 0, 0);
                            }
                        });
                    }
                    hoveredMuscle = mesh;
                    if (name !== selectedMuscle3D) {
                        muscleMeshes.forEach(m => {
                            if (m.userData.muscle === name) {
                                setMuscleEmissive(m, 0xff6b35, 0.3);
                            }
                        });
                    }
                    document.body.style.cursor = 'pointer';
                }
                
                tooltip.textContent = name;
                tooltip.style.left = event.clientX + 'px';
                tooltip.style.top = (event.clientY - 12) + 'px';
                tooltip.classList.add('visible');
            } else {
                if (hoveredMuscle && hoveredMuscle.userData.muscle !== selectedMuscle3D) {
                    muscleMeshes.forEach(m => {
                        if (m.userData.muscle === hoveredMuscle.userData.muscle) {
                            setMuscleEmissive(m, 0, 0);
                        }
                    });
                }
                hoveredMuscle = null;
                document.body.style.cursor = 'default';
                tooltip.classList.remove('visible');
            }
        }
        
        function onMouseClick(event) {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(muscleMeshes);
            
            if (intersects.length > 0) {
                const name = intersects[0].object.userData.muscle;
                if (selectedMuscle3D === name) return;
                
                if (selectedMuscle3D) {
                    muscleMeshes.forEach(m => {
                        if (m.userData.muscle === selectedMuscle3D) {
                            setMuscleEmissive(m, 0, 0);
                        }
                    });
                }
                
                selectedMuscle3D = name;
                
                muscleMeshes.forEach(m => {
                    if (m.userData.muscle === name) {
                        setMuscleEmissive(m, 0xff8c00, 0.55);
                    }
                });
                
                selectMuscle(name, null);
            }
        }
        
        function onMouseLeave() {
            document.getElementById('muscle-tooltip').classList.remove('visible');
            if (hoveredMuscle && hoveredMuscle.userData.muscle !== selectedMuscle3D) {
                muscleMeshes.forEach(m => {
                    if (m.userData.muscle === hoveredMuscle.userData.muscle) {
                        setMuscleEmissive(m, 0, 0);
                    }
                });
            }
            hoveredMuscle = null;
            document.body.style.cursor = 'default';
        }
        
        function setMuscleEmissive(mesh, colorHex, intensity) {
            if (mesh && mesh.material) {
                mesh.material.emissive.setHex(colorHex);
                mesh.material.emissiveIntensity = intensity;
                mesh.material.needsUpdate = true;
            }
        }
        
        function onWindowResize() {
            const container = document.getElementById('body-3d-container');
            if (!container || !camera || !renderer) return;
            const w = container.clientWidth;
            const h = container.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        }
        
        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
