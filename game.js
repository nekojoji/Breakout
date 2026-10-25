document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const statusDisplay = document.getElementById('status');

    // --- ゲーム設定 ---
    const CANVAS_WIDTH = canvas.width;
    const CANVAS_HEIGHT = canvas.height;
    
    // パドル設定
    const paddle = {
        height: 10,
        width: 75,
        x: (CANVAS_WIDTH - 75) / 2,
        y: CANVAS_HEIGHT - 30,
        speed: 7,
        color: '#0095DD'
    };

    // ボール設定
    const ball = {
        radius: 6,
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT - 40,
        dx: 2,
        dy: -2,
        color: '#FF4500'
    };

    // ブロック設定
    const brick = {
        rows: 10,
        cols: 8,
        width: 50,
        height: 15,
        padding: 10,
        offsetTop: 30,
        offsetLeft: 5,
        colors: ['#FF5733', '#33FF57', '#3357FF', '#FF33A6', '#33FFF5', '#FFD700', '#8A2BE2', '#FF6347']
    };

    // ゲーム状態
    let score = 0;
    let isPlaying = false;
    let keys = {};
    let bricks = [];

    // --- 初期化関数 ---

    function initializeBricks() {
        bricks = [];
        for (let c = 0; c < brick.cols; c++) {
            bricks[c] = [];
            for (let r = 0; r < brick.rows; r++) {
                bricks[c][r] = {
                    x: 0, 
                    y: 0, 
                    status: 1,
                    color: brick.colors[r % brick.colors.length]
                };
            }
        }
    }

    function resetGame() {
        isPlaying = false;
        score = 0;
        initializeBricks();
        // パドルとボールを初期位置に戻す
        paddle.x = (CANVAS_WIDTH - paddle.width) / 2;
        ball.x = CANVAS_WIDTH / 2;
        ball.y = CANVAS_HEIGHT - 40;
        ball.dx = 2; // ★ここを減らす
        ball.dy = -2; // ★ここを減らす
        statusDisplay.textContent = "Press Space to Start";
    }

    // --- 描画関数 ---

    function drawBall() {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();
        ctx.closePath();
    }

    function drawPaddle() {
        ctx.beginPath();
        ctx.rect(paddle.x, paddle.y, paddle.width, paddle.height);
        ctx.fillStyle = paddle.color;
        ctx.fill();
        ctx.closePath();
    }

    function drawBricks() {
        for (let c = 0; c < brick.cols; c++) {
            for (let r = 0; r < brick.rows; r++) {
                const brickObj = bricks[c][r];
                if (brickObj.status === 1) {
                    const brickX = (c * (brick.width + brick.padding)) + brick.offsetLeft;
                    const brickY = (r * (brick.height + brick.padding)) + brick.offsetTop;
                    
                    brickObj.x = brickX;
                    brickObj.y = brickY;

                    ctx.beginPath();
                    ctx.rect(brickX, brickY, brick.width, brick.height);
                    ctx.fillStyle = brickObj.color;
                    ctx.fill();
                    ctx.closePath();
                }
            }
        }
    }

    function drawScore() {
        ctx.fillStyle = '#333';
        ctx.font = '20px Arial';
        ctx.fillText("Score: " + score, 10, 30);
    }

    // --- 衝突判定関数 ---

    function collisionDetection() {
        for (let c = 0; c < brick.cols; c++) {
            for (let r = 0; r < brick.rows; r++) {
                const brickObj = bricks[c][r];
                if (brickObj.status === 1) {
                    const brickX = brickObj.x;
                    const brickY = brickObj.y;
                    const brickW = brick.width;
                    const brickH = brick.height;

                    // ボールとブロックの矩形衝突判定
                    if (ball.x > brickX && ball.x < brickX + brickW && ball.y > brickY && ball.y < brickY + brickH) {
                        ball.dy = -ball.dy; // 打ち返す
                        brickObj.status = 0; // ブロックを消す
                        score += 10;
                        
                        // ゲームクリア判定
                        let remainingBricks = 0;
                        for (let c_check = 0; c_check < brick.cols; c_check++) {
                            for (let r_check = 0; r_check < brick.rows; r_check++) {
                                if (bricks[c_check][r_check].status === 1) {
                                    remainingBricks++;
                                }
                            }
                        }

                        if (remainingBricks === 0) {
                            isPlaying = false;
                            statusDisplay.textContent = `GAME CLEAR! Final Score: ${score}`;
                        }
                        return;
                    }
                }
            }
        }
    }

    // --- 更新ロジック ---

    function updatePaddle() {
        if (keys['ArrowLeft'] && paddle.x > 0) {
            paddle.x -= paddle.speed;
        } else if (keys['ArrowRight'] && paddle.x < CANVAS_WIDTH - paddle.width) {
            paddle.x += paddle.speed;
        }
    }

    function updateBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;

    // 1. 壁との衝突判定
    if (ball.x + ball.radius > CANVAS_WIDTH || ball.x - ball.radius < 0) {
        ball.dx = -ball.dx;
    }
    if (ball.y - ball.radius < 0) {
        ball.dy = -ball.dy; // 上の壁に当たったら跳ね返る
    } 
    // 2. パドル衝突判定
    else if (
        ball.x + ball.radius > paddle.x && 
        ball.x - ball.radius < paddle.x + paddle.width &&
        ball.y + ball.radius > paddle.y && 
        ball.y < paddle.y + paddle.height + ball.radius
    ) {
        // 衝突が発生した場合: 垂直速度を反転させる
        ball.dy = -ball.dy;
        
        // ボールがパドルをすり抜けないようにY座標を調整（スタック防止）
        ball.y = paddle.y - ball.radius; 

        // ★速度を維持しつつ打ち返すロジックの微調整
        const relativeIntersectX = (paddle.x + (paddle.width / 2)) - ball.x;
        // 正規化された値：-1 (左端) から 1 (右端)
        const normalizedRelativeIntersectX = relativeIntersectX / (paddle.width / 2); 
        
        // 反射角度を計算 (30度～60度程度をターゲットに調整)
        // normalizedRelativeIntersectX が 0 のとき (中心) は 0度（完全に垂直）
        // normalizedRelativeIntersectX が 1 のとき (右端) は 60度（最も横方向へ）
        const bounceAngle = normalizedRelativeIntersectX * (Math.PI / 3); 
        
        // 現在の速度の絶対値を取得 (速度が0に近くなっている場合でも、最低限の勢いを維持するため)
        // 既存の速度が全て0に近づいている場合は、ベース速度 (例: 1.5) を使用する方が安定します。
        // ここでは、現在の速度の勢いを基準に調整します。
        const currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);

        if (currentSpeed < 0.1) {
            // 速度が極端に遅い（ゼロに近い）場合は、最低限の勢いを強制する
            const baseSpeed = 1.5; 
            ball.dx = baseSpeed * Math.sin(bounceAngle) * Math.sign(ball.dx);
            ball.dy = baseSpeed * Math.cos(bounceAngle) * -1;
        } else {
            // 通常のとき: 現在の勢いを保ちつつ、角度を適用
            const newDX = currentSpeed * Math.sin(bounceAngle);
            const newDY = currentSpeed * Math.cos(bounceAngle) * -1;
            
            ball.dx = newDX * Math.sign(ball.dx); // 元のX方向の向きを維持
            ball.dy = newDY;
        }
    }
    // 3. ゲームオーバー判定 (パドルを通り過ぎて床に落ちた場合)
    else if (ball.y + ball.radius > CANVAS_HEIGHT) {
        isPlaying = false;
        statusDisplay.textContent = `GAME OVER! Score: ${score}. Press Space to Restart.`;
    }
}

    // --- メインループ ---

    function draw() {
        // 画面をクリア
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        drawBricks();
        drawBall();
        drawPaddle();
        drawScore();

        if (isPlaying) {
            collisionDetection();
            updatePaddle();
            updateBall();
        }
        
        requestAnimationFrame(draw);
    }

   // --- イベントリスナー ---

    window.addEventListener("keydown", keyDownHandler, false);
    window.addEventListener("keyup", keyUpHandler, false);
    window.addEventListener("mousedown", mouseMoveHandler, false);

    function keyDownHandler(e) {
        keys[e.key] = true;
        if (e.key === " " && !isPlaying && score === 0) { 
            isPlaying = true;
            statusDisplay.textContent = "";
        } else if (e.key === " " && !isPlaying && score > 0) { 
            resetGame();
            isPlaying = true;
        }
    }

    function keyUpHandler(e) {
        keys[e.key] = false;
    }
    
    // マウス操作によるパドル移動
    function mouseMoveHandler(e) {
        if (!isPlaying) return;

        const relativeX = e.clientX - canvas.getBoundingClientRect().left;
        
        paddle.x = relativeX - paddle.width / 2;

        // 画面からはみ出さないようにクランプ処理
        if (paddle.x < 0) {
            paddle.x = 0;
        }
        if (paddle.x > CANVAS_WIDTH - paddle.width) {
            paddle.x = CANVAS_WIDTH - paddle.width;
        }
    }


    // ゲーム開始前のセットアップ
    resetGame();
    draw(); // アニメーションループを開始
});