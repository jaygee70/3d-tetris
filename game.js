// 전역 변수
let scene, camera, renderer;
let grid;
let currentPiece;
let gameBoard;
let score = 0;
let isGameOver = false;
let dropSpeed = 1000; // 블록이 떨어지는 속도 (ms)

// 테트리스 블록 타입
const SHAPES = {
    I: [ // I자 블록
        [[1],
         [1],
         [1],
         [1]]
    ],
    L: [ // L자 블록
        [[1, 0],
         [1, 0],
         [1, 1]]
    ],
    J: [ // J자 블록
        [[0, 1],
         [0, 1],
         [1, 1]]
    ],
    T: [ // T자 블록
        [[1, 1, 1],
         [0, 1, 0]]
    ],
    O: [ // O자 블록
        [[1, 1],
         [1, 1]]
    ],
    S: [ // S자 블록
        [[0, 1, 1],
         [1, 1, 0]]
    ],
    Z: [ // Z자 블록
        [[1, 1, 0],
         [0, 1, 1]]
    ],
    Single: [ // 1칸 블록
        [[1]]
    ]
};

// 게임 초기화
function init() {
    // Scene 설정
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera 설정 - 탑뷰
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 30, 0); // 위에서 내려다보는 시점
    camera.lookAt(0, 0, 0);

    // Renderer 설정
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 게임 보드 초기화
    gameBoard = createEmptyBoard();
    
    // 그리드 생성
    createGrid();

    // 첫 블록 생성
    spawnNewPiece();

    // 이벤트 리스너 추가
    document.addEventListener('keydown', onKeyPress);
    window.addEventListener('resize', onWindowResize);

    // 게임 루프 시작
    setInterval(gameLoop, dropSpeed);
    animate();
}

// 빈 게임 보드 생성
function createEmptyBoard() {
    const board = [];
    for(let y = 0; y < 20; y++) {
        board[y] = [];
        for(let x = 0; x < 10; x++) {
            board[y][x] = [];
            for(let z = 0; z < 10; z++) {
                board[y][x][z] = 0;
            }
        }
    }
    return board;
}

// 그리드 생성
function createGrid() {
    // 바닥 그리드
    const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0x888888);
    scene.add(gridHelper);

    // 수직 라인
    for(let i = 0; i <= 10; i++) {
        for(let j = 0; j <= 10; j++) {
            const geometry = new THREE.BufferGeometry();
            const points = [
                new THREE.Vector3(i - 5, 0, j - 5),
                new THREE.Vector3(i - 5, 20, j - 5)
            ];
            geometry.setFromPoints(points);
            const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x888888 }));
            scene.add(line);
        }
    }
}

// 새로운 테트리스 조각 생성
function spawnNewPiece() {
    const shapeTypes = Object.keys(SHAPES);
    const randomType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
    const shape = SHAPES[randomType][0];
    
    const group = new THREE.Group();
    
    // 블록의 각 부분 생성
    for(let y = 0; y < shape.length; y++) {
        for(let x = 0; x < shape[y].length; x++) {
            if(shape[y][x] === 1) {
                const geometry = new THREE.BoxGeometry(1, 1, 1);
                const material = new THREE.LineBasicMaterial({ color: getRandomColor() });
                const wireframe = new THREE.WireframeGeometry(geometry);
                const cube = new THREE.LineSegments(wireframe, material);
                cube.position.set(x, 0, y);
                group.add(cube);
            }
        }
    }
    
    currentPiece = {
        mesh: group,
        shape: shape,
        position: { x: 0, y: 18, z: 0 }
    };
    
    currentPiece.mesh.position.set(
        currentPiece.position.x,
        currentPiece.position.y,
        currentPiece.position.z
    );
    
    scene.add(currentPiece.mesh);
}

// 랜덤 색상 생성
function getRandomColor() {
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
    return colors[Math.floor(Math.random() * colors.length)];
}

// 키보드 입력 처리
function onKeyPress(event) {
    if (isGameOver) {
        if (event.code === 'Space') {
            resetGame();
        }
        return;
    }

    switch(event.code) {
        case 'ArrowLeft':
            movePiece(-1, 0);
            break;
        case 'ArrowRight':
            movePiece(1, 0);
            break;
        case 'ArrowUp':
            movePiece(0, -1);
            break;
        case 'ArrowDown':
            movePiece(0, 1);
            break;
        case 'KeyR':  // R키로 회전
            rotatePiece();
            break;
        case 'Space':
            hardDrop();
            break;
    }
}

// 조각 이동
function movePiece(dx, dz) {
    const newX = currentPiece.position.x + dx;
    const newZ = currentPiece.position.z + dz;

    if (isValidMove(newX, currentPiece.position.y, newZ)) {
        currentPiece.position.x = newX;
        currentPiece.position.z = newZ;
        currentPiece.mesh.position.set(
            currentPiece.position.x,
            currentPiece.position.y,
            currentPiece.position.z
        );
    }
}

// 조각 회전
function rotatePiece() {
    currentPiece.mesh.rotation.y += Math.PI/2;
}

// 하드 드롭
function hardDrop() {
    while(isValidMove(currentPiece.position.x, currentPiece.position.y - 1, currentPiece.position.z)) {
        currentPiece.position.y -= 1;
        currentPiece.mesh.position.y = currentPiece.position.y;
    }
    placePiece();
    checkLines();
    spawnNewPiece();
}

// 이동 유효성 검사
function isValidMove(x, y, z) {
    return y >= 0 && x >= -4 && x <= 4 && z >= -4 && z <= 4;
}

// 조각 배치
function placePiece() {
    const x = Math.floor(currentPiece.position.x + 5);
    const y = Math.floor(currentPiece.position.y);
    const z = Math.floor(currentPiece.position.z + 5);

    gameBoard[y][x][z] = 1;
    updateScore(10);
}

// 라인 체크
function checkLines() {
    for(let y = 0; y < 20; y++) {
        let isFull = true;
        for(let x = 0; x < 10; x++) {
            for(let z = 0; z < 10; z++) {
                if(gameBoard[y][x][z] === 0) {
                    isFull = false;
                    break;
                }
            }
            if(!isFull) break;
        }
        
        if(isFull) {
            removeLine(y);
            updateScore(100);
        }
    }
}

// 라인 제거
function removeLine(y) {
    for(let i = y; i < 19; i++) {
        gameBoard[i] = gameBoard[i + 1];
    }
    gameBoard[19] = createEmptyBoard()[0];
}

// 점수 업데이트
function updateScore(points) {
    score += points;
    document.getElementById('scoreValue').textContent = score;
}

// 게임 오버 체크
function checkGameOver() {
    if(currentPiece.position.y >= 18) {
        isGameOver = true;
        document.getElementById('gameOver').style.display = 'block';
    }
}

// 게임 리셋
function resetGame() {
    score = 0;
    isGameOver = false;
    gameBoard = createEmptyBoard();
    document.getElementById('scoreValue').textContent = '0';
    document.getElementById('gameOver').style.display = 'none';
    
    // 현재 조각 제거
    if(currentPiece && currentPiece.mesh) {
        scene.remove(currentPiece.mesh);
    }
    
    spawnNewPiece();
}

// 게임 루프
function gameLoop() {
    if(!isGameOver) {
        if(isValidMove(currentPiece.position.x, currentPiece.position.y - 1, currentPiece.position.z)) {
            currentPiece.position.y -= 1;
            currentPiece.mesh.position.y = currentPiece.position.y;
        } else {
            placePiece();
            checkLines();
            spawnNewPiece();
        }
        checkGameOver();
    }
}

// 렌더링 루프
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// 창 크기 조절 대응
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 게임 시작
init(); 