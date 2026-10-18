(function (global) {
  function miniTool() {
    var xhs = global.xhs;
    return xhs && xhs.miniTool;
  }

  function canSave() {
    var mt = miniTool();
    return !!(mt && typeof mt.saveImageToPhotosAlbum === "function");
  }

  function canPost() {
    var mt = miniTool();
    return !!(mt && typeof mt.postNote === "function");
  }

  function clip(value, max) {
    var text = String(value == null ? "" : value);
    return text.length > max ? text.slice(0, max) : text;
  }

  function fileFor(dataUrl) {
    var mt = miniTool();
    if (!mt || typeof mt.writeTempFile !== "function") {
      return Promise.resolve(dataUrl);
    }
    try {
      var task = mt.writeTempFile({ data: dataUrl });
      if (!task || typeof task.then !== "function") {
        return Promise.resolve(dataUrl);
      }
      return task.then(
        function (result) {
          return result && result.filePath ? result.filePath : dataUrl;
        },
        function () {
          return dataUrl;
        }
      );
    } catch (error) {
      return Promise.resolve(dataUrl);
    }
  }

  function saveImage(dataUrl) {
    var mt = miniTool();
    if (!mt || typeof mt.saveImageToPhotosAlbum !== "function") {
      return Promise.reject(new Error("当前环境不支持保存到相册"));
    }
    return fileFor(dataUrl).then(function (filePath) {
      return mt.saveImageToPhotosAlbum({ filePath: filePath });
    });
  }

  function postNote(dataUrl, options) {
    options = options || {};
    var mt = miniTool();
    if (!mt || typeof mt.postNote !== "function") {
      return Promise.reject(new Error("当前环境不支持发布笔记"));
    }
    return fileFor(dataUrl).then(function (filePath) {
      return mt.postNote({
        title: clip(options.title, 20),
        content: clip(options.content, 1000),
        pageType: "photo_publish",
        mediaInfo: {
          image_resources: [{ url: filePath }]
        }
      });
    });
  }

  global.MiniPlatform = {
    isAvailable: function () {
      return !!miniTool();
    },
    canSave: canSave,
    canPost: canPost,
    saveImage: saveImage,
    postNote: postNote
  };
})(typeof window !== "undefined" ? window : globalThis);
