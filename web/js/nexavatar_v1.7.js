class NexAvatar {
    constructor() {
        this.avatarName = 'toyota'
        this.eventHandlers = new Map();
        this.initialized = false;

        // Generate UUID for user tracking
        this.uuid = this._generateUUID();

        this.images = [];
        this.masks = [];
        this.overlayImages = [];
        this.currentFrame = 1;
        

        this.ranges = [[0,0]]; // Default range, will be updated by preloadConfigData
        this.actionRange = [];
        this.setFrameSilence();
        

        this.bboxData = null;
        this.maxFrame = 300;
        this.isFeating = false;
        this.FPS = 15; // 降低 FPS 讓動畫更流暢，減少閃爍
        this.FRAME_TIME = 1000 / this.FPS;
        this.lastFrameUpdate = 0;
        this.a = 2;
        this.b = 2;
        this.c = -4;
        this.d = -4;

        this.scale = 1 ;

        // to william init後直接修改
        this.preloadRanges = [0,17] ; // 只要load完就會停掉loading畫面
        //this.allowRanges = [2,3,5,9,10,11,12,13,14,15,16   ,17,18,19,20] ; // 之後才load的，speak 在還沒load完之前ranges會被變成0
        this.allowRanges = [18,19,20] ; // 之後才load的，speak 在還沒load完之前ranges會被變成0

        this.topOffset = 10 ;
        this.bottomOffset = 260 ;
        this.horiOffset = 0;

        this.debug = false;
        this.wipeGreen = true ; // set to always true

        this.isRunning = false;
        this.isLoading = true;
        this.isRangeLoading = true;

        // Check current URL to determine which API endpoint to use
        const currentUrl = window.location.href;


        if (currentUrl.includes('toyotaaisales')) {
            // only production use nexretail2
            this.api = 'https://nexretail2.scsonic.com'; 
        } else {
            this.api = 'https://nexretail.scsonic.com';
        }


        this.hasNewMotion = false ;

        this.avatarState = 0 ; // silence
        // this.avatarStatus = 1 // moving

        // WebSocket 和 Audio 實例
        this.ws = null;
        this.audio = null;

        // 音素動畫相關屬性
        this.phonemeImages = [];
        this.isPhonemeMode = false;
        this.phonemeFrameIndex = 0;
        this.phonemeFrameCount = 0;
        this.phonemeStartTime = 0;
        this.phonemeFrameDuration = 100; // 每幀持續時間（毫秒）

        // temp use toyota ranges
        


        // for test 
        //if (this.avatarName == "liangwei_540s"){
        this.setFrameSilence();
        //}
    }

    setFrameRangeIds(ids){
        var arr = []
        if (ids == undefined || !this.ranges){
            return arr ;
        }
        for (var i = 0 ; i < ids.length ; i++){
            var id = ids[i];
            if (this.ranges[id] && this.ranges[id][0] !== undefined && this.ranges[id][1] !== undefined) {
                var idStart = this.ranges[id][0] ;
                var idEnd = this.ranges[id][1] ;
                for (var j = idStart ; j <= idEnd ; j++){
                    arr.push(j);
                }
            }
        }
        return arr;
    }



    setFrameRange(start, end) {
        console.log("setFrameRange " + start + " " + end)
        if ( start == 0 || end == 0){
            this.log("Error range value, can't be zero, starting from 1:" + start + "~" + end);
            return false ;
        }
        var arr = []
        // 只做正向循環，不做來回動畫，讓人物持續顯示
        for (var i = start ; i <= end ; i++ ){
            arr.push(i);
        }
        // 移除反向循環，讓動畫更流暢
        // for (var i = end-1; i > start ; i--){
        //     arr.push(i) ;
        // }
        return arr;
    }

    setFrameSilence() {
        var r = this.ranges[0] ;
        this.silenceRange = this.setFrameRange(r[0], r[1]) ;
        this.actionRange = [] ;
    }

    async init(config){
        // Register user connection
        this._registerUserConnection();
        
        // Setup page unload event to track when user leaves
        this._setupUnloadTracking();
        
        if (config.containerLable != undefined) {
            // Find the container element
            const container = document.querySelector(config.containerLable);
            if (!container) {
                this.emit('error', `Container ${config.containerLable} not found`);
                return;
            }

            // Create canvas element
            const canvas = document.createElement('canvas');
            // 讓 canvas 寬高等於容器
            const setCanvasSize = () => {
                canvas.width = container.clientWidth;
                canvas.height = container.clientHeight;
            };
            setCanvasSize();
            
            // Style canvas for centering
            canvas.style.display = 'block';
            canvas.style.margin = '0 auto';
            // 監聽 resize 事件
            window.addEventListener('resize', () => {
                setCanvasSize();
            });

            var temp_scale = 1 ;
            if (container.clientWidth / 540 < 1.0) {
                temp_scale = Math.round((container.clientWidth / 540 * 0.9) * 100) / 100;
                
                canvas.width = container.clientWidth; 
                
                this.topOffset = Math.round(this.topOffset / 0.9);
                this.horiOffset = 0;
                this.leftOffset = Math.round((540 - container.clientWidth) * 0.92);
                
                canvas.height = 960 - this.topOffset - this.bottomOffset;

                canvas.style.top = '0px';
                canvas.style.bottom = 'auto';
            }
            canvas.width = 540 ;
            
            // Add canvas to container
            container.appendChild(canvas);
            setCanvasSize();
            // 確保 offscreenCanvas 寬高為正整數且大於 0
            let offW = canvas.width;
            let offH = canvas.height;
            if (!offW || !offH) {
                offW = 540;
                offH = 720;
            }
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.offscreenCanvas = new OffscreenCanvas(offW, offH);
            this.offscreenCtx = this.offscreenCanvas.getContext('2d');
            this.setScale(temp_scale)

            console.log("----------")
            console.log("container clientWidth=" + container.clientWidth, "clientHeight=" + container.clientHeight);
            console.log("width=" + canvas.width, "height=" + canvas.height);
            console.log("width ratio= " + (container.clientWidth / 540))
            console.log("topOffset=" + this.topOffset);
            console.log("leftOffset=" + this.leftOffset); 
            console.log("horiOffset=" + this.horiOffset);
            console.log("scale=" + this.scale);
            console.log("----------")
        }
        this.emit('intialSucccess', 'All images loaded successfully');
        return {};
    }

    on(eventName, callback) {
        if (!this.eventHandlers.has(eventName)) {
            this.eventHandlers.set(eventName, []);
        }
        this.eventHandlers.get(eventName).push(callback);
    }

    emit(eventName, data) {
        const handlers = this.eventHandlers.get(eventName);
        if (handlers) {
            handlers.forEach(handler => handler(data));
        }
    }

    async start(config) {
        try {
            // Initialize with the provided avatar
            // if (config.avatarName != undefined ) {
            //     this.avatarName = config.avatarName;
            // }
            
            this.load(this.avatarName);

            if (!this.isRunning) {
                this.isRunning = true;
                requestAnimationFrame(this.drawFrame.bind(this));
            }

            if (config.debug !== undefined){
                this.debug = config.debug;
            }
            if (config.wipeGreen !== undefined){
                this.wipeGreen = config.wipeGreen;
            }

            if (config.api !== undefined){
                this.api = config.api
            }
        } catch (error) {
            this.emit('error', error.message);
            throw error;
        }
    }

    log(line) {
        if (this.debug) {
            console.log(line);
        }
    }

    async speak(dd) {
        try {
            var messages = dd.messages ? dd.messages: undefined;
            // 支援官方格式：優先使用 text，然後是 content，最後是字串
            const text = typeof dd === 'object' ? (dd.text || dd.content) : dd;
            
            // 開始音素動畫模式
            this.startPhonemeMode();
            
            // default range id = 0: silence range
            // range id = 1: speak range
            // Create WebSocket connection
            // 如果已經有正在進行的連線，先關閉它
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }
            if (this.audio) {
                this.audio.pause();
                this.audio.currentTime = 0;
                this.audio = null;
            }
            this.hasNewMotion = false ;
            
            if ( this.isFeating ) {
                this.isFeating = false ;
                this.actionRange = [] ;
                this.overlayImages = [];
                await new Promise(resolve => setTimeout(resolve, 500));
                console.log("is speaking! make a delay after break")
            }

            this.actionRange = [] ;
            this.overlayImages = [];

            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'wss:';

            const startTime = performance.now();
            console.log("ws connect start") ;
            this.ws = new WebSocket(`${protocol}//${new URL(this.api).host}/ws`);
            
            let audioPlayed = false;
            let currentImages = [];

            // Create empty Audio object that will be populated when data.wav is available
            this.audio = new Audio();
            
            this.isFirstData = false ;

            if (dd.rangeIds == undefined ){
                dd.rangeIds = [0];
            }
            
            return new Promise((resolve, reject) => {
                this.ws.onopen = () => {
                    // Send the initial data
                    // Check and modify rangeIds if they are in allowRanges

                    let modifiedRangeIds = dd.rangeIds.map(id => {
                        if (this.isRangeLoading == false){
                            return id ;
                        }
                        else if (this.allowRanges.includes(id)){
                            this.log("Warning, is range loading = true, can't play range:" + id + ", modify the range to 0") ;
                            return 0
                        }
                        return id;
                    }
                    );

                    console.log("this.isRangeLoading =" + this.isRangeLoading + "after modify frame id=", + modifiedRangeIds);
                    dd.rangeIds = modifiedRangeIds;
                    
                    var sendData = {
                        frame_index: this.currentFrame,
                        text: text,
                        avatar: this.avatarName,
                        rangeIds: modifiedRangeIds,
                    };
                    if (messages != undefined ) {
                        sendData["messages"] = messages;
                    }
                    this.ws.send(JSON.stringify(sendData));
                };
                
                this.ws.onmessage = async (event) => {
                    if (this.isFirstData == false ) {
                        this.actionRange = [] ;
                        this.overlayImages = [] ;
                        this.isFirstData = true ;
                    }
                    const data = JSON.parse(event.data);

                    console.log("overlayImages before parse=" + this.overlayImages.length);

                    if (data.status === 'processing') {
                        // if is single base64
                        if (data.pic) {
                            const img = new Image();
                            img.crossOrigin = "anonymous";
                            await new Promise((resolve, reject) => {
                                img.onload = resolve;
                                img.onerror = reject;
                                img.src = data.pic;
                            });
                            this.overlayImages.push(img);
                            console.log("overlayImages count (pic)=" + this.overlayImages.length);
                        }

                        if (data.text){
                            this.emit('text', data.text);
                        }

                        // if is base64 string
                        if (data.pics) {
                            // for (const pic of data.pics) {
                            //     const img = new Image();
                            //     img.crossOrigin = "anonymous";
                            //     await new Promise((resolve, reject) => {
                            //         img.onload = resolve;
                            //         img.onerror = reject;
                            //         img.src = pic;
                            //     });
                            //     this.overlayImages.push(img);
                            // }
                            // console.log("overlayImages count (pics)=" + this.overlayImages.length);
                            const loadImage = (src) => {
                                return new Promise((resolve, reject) => {
                                    const img = new Image();
                                    img.crossOrigin = "anonymous";
                                    img.onload = () => resolve(img);
                                    img.onerror = reject;
                                    img.src = src;
                                });
                            };
                            
                            const images = await Promise.all(data.pics.map(loadImage));
                            this.overlayImages.push(...images);
                            console.log("overlayImages count (await pics)=" + this.overlayImages.length);
                        }
                        
                        // if is vertical merged
                        if (data.vpic) {
                            const tempImg = new Image();
                            tempImg.onload = () => {
                                const tempCanvas = document.createElement('canvas');
                                const tempCtx = tempCanvas.getContext('2d');
                                tempCanvas.width = 160;
                                tempCanvas.height = 160;
                                const numSegments = tempImg.height / 160;
                                for (let i = 0; i < numSegments; i++) {
                                    // Draw the specific segment to the temp canvas
                                    tempCtx.drawImage(tempImg,
                                        0, i * 160, // Source x, y
                                        160, 160,    // Source width, height
                                        0, 0,        // Destination x, y
                                        160, 160     // Destination width, height
                                    );
                                    
                                    const segmentImg = new Image();
                                    segmentImg.src = tempCanvas.toDataURL();
                                    
                                    this.overlayImages.push(segmentImg);
                                    tempCtx.clearRect(0, 0, 160, 160);
                                }
                                console.log("Added " + numSegments + " segments to overlayImages");
                                console.log("overlayImages count (vpic)=" + this.overlayImages.length);
                            };
                            tempImg.src = data.vpic;
                        }

                        if (data.wav && !audioPlayed) {
                            // 檢查是否有自定義音訊覆蓋
                            if (dd.customAudio) {
                                console.log("使用自定義音訊覆蓋原始 wav");
                                this.audio.src = dd.customAudio;
                            } else {
                                // Set the source of the previously created Audio object
                                this.audio.src = data.wav;
                            }
                            audioPlayed = true;
                            console.log("currentFrame=" + this.currentFrame + " must be wait to play, the frame is:" + this.ranges[0][0]) ;
                            
                            this.audio.addEventListener('loadedmetadata', async () => {

                                if (this.debug) {
                                    console.log("fake wait for mac") ;
                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                }
                                console.log("audio duration:" + this.audio.duration + " bnf blocks=" + data.bnfblocks) ;
                                console.log("avg frame/per ms:" + this.audio.duration * 1000 / (1+data.bnfblocks)) ;


                                // must be extend action range until actin range.length > action length
                                while (this.actionRange.length < data.bnfblocks){
                                    this.log("action range length " + this.actionRange.length + " < bnfblocks " + data.bnfblocks + " need extend action range");
                                    // append silence range
                                    for (var i = this.ranges[0][0]; i <= this.ranges[0][1]; i++){
                                        this.actionRange.push(i);
                                    }
                                    this.log("action range extended length=" + this.actionRange.length);
                                }
                                this.hasNewMotion = true ;
                            });
                            
                            this.audio.addEventListener('play', () => {
                                console.log("audio played, current frame = " + this.currentFrame) ;
                                
                                this.isFeating = true;
                                this.actionRange = this.setFrameRangeIds(dd.rangeIds) ; // todo: replace with bnf size
                                this.currentFrame = 0;
                                this.startTime = undefined ; // force call re calc
                                this.emit('speakStart', { message: 'Speech started' });
                            });


                            this.audio.addEventListener('ended', () => {
                                console.log("audio player end, current frame = " + this.currentFrame) ;
                                this.isFeating = false;
                                this.overlayImages = [] ;
                                //this.setFrameSilence();
                                
                                // 結束音素動畫模式
                                this.endPhonemeMode();
                                
                                // 觸發 speakEnd 事件
                                this.emit('speakEnd', { message: 'Speech ended' });
                            });
                        }
                        const responseTime = Math.round(performance.now() - startTime);
                        console.log(`WebSocket onMessage - start Time: ${responseTime}ms` + " overlayImage size=" + this.overlayImages.length);
                    } // end of processing
                    if (data.status === 'completed') {
                        try {
                            var r = data.result;
                            console.log("azure:" + r.azure + " wenet:" + r.wenet + " munet:" + r.munet + " workername:" + r.workername );
                        }
                        catch (err){
                            console.log("error log complete value:" + err);
                        }
                    }
                };
                
                this.ws.onerror = (error) => {
                    this.emit('error', `WebSocket error: ${error}`);
                    this.isFeating = false;
                    this.overlayImages = [] ;
                    reject(error);
                };
                
                this.ws.onclose = () => {
                    const responseTime = Math.round(performance.now() - startTime);
                    console.log(`WebSocket connection closed, total time: ${responseTime}ms`);
                    this.lastFrameUpdate = 0;
                    resolve();
                };
            });
        } catch (error) {
            this.emit('error', error.message);
            throw error;
        }
    }
    async preloadImages() {
        const batchSize = 5; // Load 2 images at a time
        const maxRetries = 5;
        this.images = new Array(this.maxFrame);
        this.masks = new Array(this.maxFrame);
        this.loadedCount = 0;

        

        const loadImage = async (index, retryCount = 0) => {
            try {
                // 1: load fore ground - 修改為使用本地圖片
                const img = new Image();
                img.crossOrigin = "anonymous";
                const loadPromise = new Promise((resolve, reject) => {
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                });
                // 修改圖片路徑為本地 full_imgs 資料夾
                img.src = `../full_imgs/${String(index).padStart(8, '0')}.png`;
                const loadedImg = await loadPromise;
                this.images[index - 1] = loadedImg;

                // 2: load background - 暫時停用遮罩功能
                if (this.wipeGreen){
                    // 暫時停用綠色背景移除，因為沒有對應的遮罩圖片
                    this.wipeGreen = false;
                    console.log("Disabled wipeGreen because no mask images available");
                }

                return true;
            } catch (error) {
                if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
                    return loadImage(index, retryCount + 1);
                }
                throw error;
            }
        };

        console.log("preload images");
        this.log("current ranges=" + this.ranges) ;

        try {
            // 載入所有需要的圖片，確保動畫流暢
            const maxImages = Math.min(50, this.ranges[0][1]); // 增加到 50 張圖片
            console.log("preload images from 1 to " + maxImages);
            
            for (let i = 1; i <= maxImages; i += batchSize) {
                const batch = [];
                for (let j = 0; j < batchSize && (i + j) <= maxImages; j++) {
                    batch.push(loadImage(i + j));
                }
                await Promise.all(batch);
            }

            this.isLoading = false;
            this.isRangeLoading = false;
            this.log("load local images done, set loading = false");

        } catch (error) {
            this.emit('error', `Error loading images: ${error.message}`);
            throw error;
        }
    }


    // async preloadMasks() {
    //     const batchSize = 5; // Load 2 images at a time
    //     const maxRetries = 5;
    //     this.masks = new Array(this.maxFrame);
    //     this.loadedCount = 0;

    //     const loadImage = async (index, retryCount = 0) => {

    //     };

    //     try {
    //         // Process images in batches
    //         for (let i = 0; i < this.maxFrame; i += batchSize) {
    //             const batch = [];
    //             for (let j = 0; j < batchSize && (i + j) < this.maxFrame; j++) {
    //                 batch.push(loadImage(i + j + 1));
    //             }
    //             await Promise.all(batch);
    //         }
    //     } catch (error) {
    //         this.emit('error', `Error loading images: ${error.message}`);
    //         throw error;
    //     }
    // }

    async preloadConfigData() {
        try {
            // 使用本地圖片，設定適合的範圍
            // 根據實際載入的圖片數量來設定範圍
            this.ranges = [[1, 50]]; // 設定為實際載入的圖片數量
            this.log("Using local image ranges:" + this.ranges);
            this.setFrameSilence(); // Update action ranges based on new ranges
        } catch (error) {
            this.emit('error', 'Error setting local config: ' + error);
            // Keep default range if config loading fails
        }
    }

    async preloadBoundingBoxData() {
        try {
            // 使用本地圖片，不需要邊界框數據
            this.bboxData = null;
            this.maxFrame = 50; // 設定為實際載入的圖片數量
            this.log("Using local images, no bounding box data needed");
        } catch (error) {
            this.emit('error', 'Error setting local bounding box config: ' + error);
        }
    }

    // input: number
    setScale(s){
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.scale = s ;
        this.ctx.scale(s, s);
    }

    updateFrame(timestamp) {
        if (!this.startTime) {
            this.startTime = timestamp;
            this.lastFrameUpdate = timestamp;
            return;
        }
        this.FRAME_TIME = 1000 / this.FPS;

        // 計算從開始到現在應該過了幾幀
        const totalElapsed = timestamp - this.startTime;
        const expectedFrame = Math.floor(totalElapsed / this.FRAME_TIME);
        
        // 確保動畫連續，避免跳幀
        if (expectedFrame >= this.currentFrame) {
            this.currentFrame = expectedFrame;
            
            // 當幀數過大時，重置為循環範圍內
            if (this.silenceRange.length > 0 && this.currentFrame >= this.silenceRange.length) {
                this.currentFrame = this.currentFrame % this.silenceRange.length;
                // 重置開始時間以保持流暢的循環
                this.startTime = timestamp - (this.currentFrame * this.FRAME_TIME);
            }
            
            // 更新最後一幀的時間點
            this.lastFrameUpdate = this.startTime + (this.currentFrame * this.FRAME_TIME);
        }
    }

    removeGreen(ctx, mask) {
        // Get image data from both the main canvas and mask
        let imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Create a temporary canvas for the mask
        let tempCanvas = document.createElement('canvas');
        tempCanvas.width = ctx.canvas.width;
        tempCanvas.height = ctx.canvas.height;
        let tempCtx = tempCanvas.getContext('2d');
        
        // Draw the mask with the same dimensions as the main canvas
        // tempCtx.drawImage(mask, 0, 0, ctx.canvas.width, ctx.canvas.height);
        tempCtx.drawImage(mask,
             this.horiOffset, this.topOffset, ctx.canvas.width, ctx.canvas.height,
             this.leftOffset* this.scale, 0, ctx.canvas.width * this.scale, ctx.canvas.height * this.scale);
        
        // Get mask data
        let maskData = tempCtx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height).data;
        let mainData = imageData.data;

        // Process each pixel
        for (let i = 0; i < mainData.length; i += 4) {
            // Get mask RGB values
            let maskR = maskData[i];
            let maskG = maskData[i + 1];
            let maskB = maskData[i + 2];
            
            // Calculate average of RGB values from mask
            let maskAverage = (maskR + maskG + maskB) / 3;
            
            // Set the alpha channel of the main image using the mask's average
            mainData[i + 3] = maskAverage;
        }

        ctx.putImageData(imageData, 0, 0);
    }

    drawFrame(timestamp) {
        if (!this.isRunning) return;

        this.updateFrame(timestamp);
        const cf = this.currentFrame ;
        
        var frameIdx = this.silenceRange[cf % this.silenceRange.length] ;
        if (this.actionRange.length > 0 && cf < this.actionRange.length){
            // the currentFrame must be set with 0, in the range interval
            frameIdx = this.actionRange[cf];
        }

        if (this.isFeating){
            //console.log("bnf " + (this.currentFrame + 1) + " use " + frameIdx) ;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
        

        if (this.isLoading){
            // Draw loading text
            // this.ctx.font = '24px Arial';
            // this.ctx.fillStyle = '#333';
            // this.ctx.textAlign = 'center';
            // this.ctx.textBaseline = 'middle';
            // this.ctx.fillText('Loading...', this.canvas.width / 2, this.canvas.height / 2);

            // // Draw loading spinner
            // const centerX = this.canvas.width / 2;
            // const centerY = this.canvas.height / 2 - 40;
            // const radius = 20;
            // const time = Date.now();

            // this.ctx.beginPath();
            // this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            // this.ctx.strokeStyle = '#ddd';
            // this.ctx.lineWidth = 3;
            // this.ctx.stroke();

            // // Animated arc
            // this.ctx.beginPath();
            // this.ctx.arc(centerX, centerY, radius, (time / 500) % (Math.PI * 2), ((time / 500) % (Math.PI * 2)) + Math.PI);
            // this.ctx.strokeStyle = '#666';
            // this.ctx.stroke();

            if (this.isRunning) {
                requestAnimationFrame(this.drawFrame.bind(this));
            }
            return;
        }


        // 更新音素動畫
        this.updatePhonemeAnimation(timestamp);
        
        // 等比縮放繪製圖片
        const drawImageFit = (img) => {
            const imgRatio = img.width / img.height;
            const canvasRatio = this.canvas.width / this.canvas.height;
            let drawWidth, drawHeight, offsetX, offsetY;
            if (imgRatio > canvasRatio) {
                drawWidth = this.canvas.width;
                drawHeight = drawWidth / imgRatio;
                offsetX = 0;
                offsetY = (this.canvas.height - drawHeight) / 2;
            } else {
                drawHeight = this.canvas.height;
                drawWidth = drawHeight * imgRatio;
                offsetX = (this.canvas.width - drawWidth) / 2;
                offsetY = 0;
            }
            this.offscreenCtx.drawImage(img, 0, 0, img.width, img.height, offsetX, offsetY, drawWidth, drawHeight);
        };
        if (this.isPhonemeMode && this.isFeating) {
            const phonemeImg = this.getCurrentPhonemeImage();
            if (phonemeImg) {
                drawImageFit(phonemeImg);
            } else if (this.images[frameIdx-1]) {
                drawImageFit(this.images[frameIdx-1]);
            }
        } else {
            if (this.images[frameIdx-1]) {
                drawImageFit(this.images[frameIdx-1]);
            }
        }


        if (this.bboxData && this.bboxData["" + frameIdx]) {
            const [x1, x2, y1, y2] = this.bboxData["" + frameIdx];
            
            // Draw the bounding box
            if (this.debug) {
                this.ctx.beginPath();
                this.ctx.rect(x1 + this.leftOffset - this.horiOffset, y1 - this.topOffset, x2 - x1, y2 - y1);
                this.ctx.strokeStyle = 'red';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }

            // Draw overlay image if isFeating is true
            if (this.isFeating && this.overlayImages.length > 0) {
                var x_pos = x1 + this.a + this.leftOffset - this.horiOffset;
                // if (this.debug) {
                //     x_pos = 0
                // }
                if (this.overlayImages[cf]) {
                    this.offscreenCtx.drawImage(
                        this.overlayImages[cf], 
                        x_pos, 
                        y1 + this.b - this.topOffset, 
                        (x2-x1) + this.c, 
                        y2-y1 + this.d
                    );
                    if (this.debug) {
                        this.ctx.fillText("currentFrame=" + cf + " frameidx =" + frameIdx, 10, 70);
                    }
                }
                else {
                    if (this.debug) {
                        console.log("Warning Missing overlayImages Q_Q " + cf) ;
                    }
                }
            }
        }
        else {
            if (this.debug) {
                console.log("Missing bboxData with frame " + frameIdx) ;
            }
        }


        this.ctx.drawImage(this.offscreenCanvas, 0, 0);
        if (this.wipeGreen && this.masks[frameIdx-1]) {
            // Now apply the removeGreen effect
            this.removeGreen(this.ctx, this.masks[frameIdx-1]);
        }


                
        if (this.debug) {
            this.ctx.font = "20px Arial";
            var line = "currentFrame=" + cf + " frameIdx=" + frameIdx + " FPS=" + this.FPS + "";
            this.ctx.fillText(line, 50, 40);

            if (this.isFeating && this.overlayImages.length > 0) {
                if (this.debug) {
                    this.ctx.fillText("currentFrame=" + cf + " frameidx =" + frameIdx, 50, 70);
                }
            }
            
            // 顯示音素動畫狀態
            if (this.isPhonemeMode) {
                this.ctx.fillText("Phoneme: " + this.phonemeFrameIndex + "/" + this.phonemeImages.length, 50, 100);
            }
        }

        

        if (this.isRunning) {
            requestAnimationFrame(this.drawFrame.bind(this));
        }

        if ( Math.abs(frameIdx - this.ranges[0][0]) <= 2 &&
            this.hasNewMotion == true &&
            this.audio != undefined) {
            // need switch!!
            this.log("Trigger hasNewMotion!!! ") ;
            this.emit('beforeSpeak', { message: 'ready to started speaking' });
            this.audio.play().catch(console.error);
            this.hasNewMotion = false ;
        }
        else if (this.hasNewMotion == true) {
            console.log("Waiting for frame, now:" + frameIdx + " target is:" + this.ranges[0][0]);

        }
        
    }

    async load(avatarName) {
        this.stop();
        this.avatarName = avatarName; 
        this.currentFrame = 1;
        this.overlayImages = [];
        this.images = [];
        
        try {
            this.isLoading = true;
            await this.preloadConfigData(); 
            await this.preloadBoundingBoxData(); 

            // the range 0 must be prepared
            await this.preloadImages();
            
            // 載入音素圖片
            await this.loadPhonemeImages();
            
            if (this.debug) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            //this.isLoading = false; move inside preload Images
        } catch (error) {
            console.error('Error loading avatar:', error);
        }
    }

    stop() {
        this.isFeating = false ;
        this.currentFrame = 0
        this.setFrameSilence();

        // 結束音素動畫模式
        this.endPhonemeMode();

        try {
            // 停止 WebSocket 連線
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.close();
                this.ws = null;
            }
        } catch (error) {
            console.error('停止 WebSocket 時發生錯誤:', error);
        }

        try {
            // 停止音訊播放
            if (this.audio) {
                this.audio.pause();
                this.audio.currentTime = 0;
                this.audio = null;
            }
        } catch (error) {
            console.error('停止音訊播放時發生錯誤:', error);
        }
    }

    // 載入音素圖片
    async loadPhonemeImages() {
        try {
            console.log("開始載入音素圖片...");
            this.phonemeImages = [];
            
            // 載入 128 張音素圖片
            for (let i = 1; i <= 128; i++) {
                const img = new Image();
                img.crossOrigin = "anonymous";
                
                await new Promise((resolve, reject) => {
                    img.onload = () => {
                        this.phonemeImages.push(img);
                        resolve();
                    };
                    img.onerror = (error) => {
                        console.warn(`無法載入音素圖片 ${i}:`, error);
                        reject(error);
                    };
                    img.src = `../phoneme/ComfyUI_test1_${String(i).padStart(5, '0')}_.png`;
                });
            }
            
            console.log(`成功載入 ${this.phonemeImages.length} 張音素圖片`);
        } catch (error) {
            console.error("載入音素圖片時發生錯誤:", error);
        }
    }

    // 開始音素動畫模式
    startPhonemeMode() {
        console.log("開始音素動畫模式");
        this.isPhonemeMode = true;
        this.phonemeFrameIndex = 0;
        this.phonemeFrameCount = 0;
        this.phonemeStartTime = performance.now();
    }

    // 結束音素動畫模式
    endPhonemeMode() {
        console.log("結束音素動畫模式");
        this.isPhonemeMode = false;
        this.phonemeFrameIndex = 0;
        this.phonemeFrameCount = 0;
    }

    // 更新音素動畫
    updatePhonemeAnimation(timestamp) {
        if (!this.isPhonemeMode || this.phonemeImages.length === 0) {
            return;
        }

        const elapsed = timestamp - this.phonemeStartTime;
        const frameIndex = Math.floor(elapsed / this.phonemeFrameDuration) % this.phonemeImages.length;
        
        if (frameIndex !== this.phonemeFrameIndex) {
            this.phonemeFrameIndex = frameIndex;
            this.phonemeFrameCount++;
        }
    }

    // 獲取當前音素圖片
    getCurrentPhonemeImage() {
        if (this.isPhonemeMode && this.phonemeImages.length > 0) {
            return this.phonemeImages[this.phonemeFrameIndex];
        }
        return null;
    }
}

    

// User tracking helper methods
NexAvatar.prototype._generateUUID = function() {
    // Generate a random UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

NexAvatar.prototype._registerUserConnection = function() {
    // Send UUID to server to register connection
    fetch(`${this.api}/user/connect`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uuid: this.uuid })
    })
    .then(response => response.json())
    .then(data => {
        if (this.debug) {
            console.log('User connection registered:', data);
        }
    })
    .catch(error => {
        console.error('Error registering user connection:', error);
    });
};

NexAvatar.prototype._notifyUserDisconnection = function() {
    // Manually notify server about disconnection
    fetch(`${this.api}/user/disconnect`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uuid: this.uuid })
    })
    .then(response => response.json())
    .then(data => {
        if (this.debug) {
            console.log('User disconnection notified:', data);
        }
    })
    .catch(error => {
        console.error('Error notifying user disconnection:', error);
    });
};

NexAvatar.prototype._setupUnloadTracking = function() {
    // Use sendBeacon to notify when user closes the page
    window.addEventListener('beforeunload', () => {
        // Create the data to send
        const data = JSON.stringify({ uuid: this.uuid });
        
        // Use sendBeacon which is designed specifically for sending analytics
        // data during page unload
        navigator.sendBeacon(`${this.api}/user/disconnect`, data);
        
        if (this.debug) {
            console.log('Sent disconnect beacon for UUID:', this.uuid);
        }
    });
};

if (typeof window !== 'undefined') {
    window.NexAvatar = NexAvatar;
}
