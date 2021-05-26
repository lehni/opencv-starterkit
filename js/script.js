function onVideoFrame(video) {
  project.clear(); // Start with a clear Paper.js document on each frame
  let paths = findContourPaths(video, {
    minArea: 500,
    // smooth: true,
    // simplify: 5,
    pathSettings: {
      fillColor : 'red',
      strokeColor: 'black',
      strokeWidth: 10,
      strokeJoin: 'round',
      strokeCap: 'round'
    }
  });
}

startVideo();

function startVideo() {
  let video = document.getElementById('video');
  let camera = new Camera(video, {
    onFrame() {
      onVideoFrame(video);
    },
    width: 1280,
    height: 720
  });
  camera.start();
}

let canvas = null;

function findContourPaths(video, settings) {
  try {
    if (!canvas) {
      // Create a canvas to draw video frames to, in order to find contours.
      canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    // Draw current video frame to canvas.
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    // Use OpenCV thresholding on the frame, then find contours:
    let hierarchy = new cv.Mat();
    let contours = new cv.MatVector();
    let src = cv.imread(canvas);
    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
    cv.threshold(src, src, 128, 255, cv.THRESH_BINARY_INV);
    cv.findContours(src, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    // Convert the countours to Paper.js paths
    let paths = convertContoursToPaths(contours, settings);
    src.delete();
    contours.delete();
    hierarchy.delete();
    return paths;
  }
  catch (error) {
    console.error(error);
  }
}

function convertContoursToPaths(contours, {
  minArea = 32,
  smooth = false,
  simplify = false,
  pathSettings = {}
} = {}) {
  // Conversts OpenCV contours to Paper.js paths.
  // This is rather cryptic due to OpenCV's internal data-structures.
  let paths = [];
  for (let i = 0; i < contours.size(); i++) {
    let cnt = contours.get(i);
    if (cv.contourArea(cnt) > minArea) {
      let points = [];
      let data = cnt.data32S;
      for (let j = 0; j < data.length; j += 2) {
        let pt = new Point(data[j], data[j + 1]);
        points.push(pt);
      }
      let path = new Path({
        segments: points,
        closed: true,
        ...pathSettings
      });
      if (simplify) {
        path.simplify(simplify === true ? 2.5 : simplify);
      }
      if (smooth) {
        path.smooth(smooth === true ? { type: 'continuous' } : smooth);
      }
      paths.push(path);
    }
  }
  return paths;
}
