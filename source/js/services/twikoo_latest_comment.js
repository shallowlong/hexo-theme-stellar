// [xishu-custom] 本文件在上游 twikoo_latest_comment.js 基础上做增量扩展，未改变上游渲染结构：
//   1) exclude —— 排除指定 path 的评论（逗号分隔、前缀匹配），用于过滤签筒留言墙 /footprint-sticks 等非文章评论
//   2) titles  —— 构建期生成的 path→内容标题 映射（主工程 scripts/comments-post-map.js），用于显示「来源文章」
//   3) 保留上游行为：空评论跳过、commentText 截断 50 字、hide=reply 时不含回复
(function () {
  const el = document.querySelector('.ds-twikoo');
      utils.onLoading(el); // 加载动画
 
      const api = el.dataset.api;
      const limit = parseInt(el.getAttribute('limit')) || 10;
      const reply = el.getAttribute('hide') !== 'reply';
      if (!api) return;

      // [xishu-custom] 需要排除的评论 path，逗号分隔
      const excludePaths = (el.getAttribute('exclude') || '')
        .split(',')
        .map(s => s.trim())
        .filter(s => s !== '');
      // [xishu-custom] path→标题 映射地址
      const titlesSrc = el.getAttribute('titles');

      // [xishu-custom] path 归一化：必须与主工程 scripts/comments-post-map.js 的 normalizePath 保持一致
      function xsNormalizePath(input) {
        if (!input) {
          return '';
        }
        let path = String(input).replace(/^https?:\/\/[^/]+/i, '');
        path = path.split('#')[0].split('?')[0].replace(/\\/g, '/');
        if (path.charAt(0) !== '/') {
          path = '/' + path;
        }
        path = path.replace(/\/index\.html$/, '/').replace(/\/index$/, '/').replace(/\.html$/, '');
        if (path.length > 1 && path.charAt(path.length - 1) !== '/') {
          path += '/';
        }
        return path;
      }

      // [xishu-custom] HTML 转义（沿用上游 commentText 的转义口径）
      function xsEscape(str) {
        return String(str == null ? '' : str)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      }

      // [xishu-custom] 是否命中排除列表（前缀匹配：/a 同时排除 /a 与 /a/b）
      function xsIsExcluded(path) {
        for (let i = 0; i < excludePaths.length; i++) {
          const target = xsNormalizePath(excludePaths[i]);
          if (!target) {
            continue;
          }
          if (path === target || path.indexOf(target) === 0) {
            return true;
          }
        }
        return false;
      }

      // [xishu-custom] 渲染评论列表（titles 为 path→标题 映射，缺失时降级为不显示标题）
      function xsRender(titles) {
        fetch(api, {
          method: "POST",
          body: JSON.stringify({
            "event": "GET_RECENT_COMMENTS",
            "envId": api,
            "pageSize": limit,
            "includeReply": reply
          }),
          headers: { 'Content-Type': 'application/json' }
        })
        .then(res => res.json())
        .then(({ data }) => {
          utils.onLoadSuccess(el); // 移除动画
          if (!Array.isArray(data)) {
            utils.onLoadFailure(el);
            return;
          }
          data.forEach((comment, j) => {
            let commentText = comment.commentText;
            if (!commentText || commentText.trim() === '') return; // 跳过空评论
            const path = xsNormalizePath(comment.url);
            if (xsIsExcluded(path)) return; // [xishu-custom] 跳过被排除的评论（如签筒留言墙）
            const title = titles[path]; // [xishu-custom] 来源文章标题
            // 转义字符
            commentText = xsEscape(commentText);
            commentText = commentText.length > 50 ? commentText.substring(0, 50) + '...' : commentText;
            var cell = '<div class="timenode" index="' + j + '">';
            cell += '<div class="header">';
            cell += '<div class="user-info">';
            cell += '<span>' + xsEscape(comment.nick) + '</span>';
            cell += '</div>';
            cell += '<span>' + new Date(comment.created).toLocaleString('zh-CN', {month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false}) + '</span>';
            cell += '</div>';
            cell += '<a class="body" href="' + xsEscape(comment.url) + '#' + xsEscape(comment.id) + '">';
            cell += commentText;
            if (title) {
              cell += '<span class="xs-latest-comment-post">' + xsEscape(title) + '</span>'; // [xishu-custom] 来源文章
            }
            cell += '</a>';
            cell += '</div>';
            utils.dom(el).append(cell);
          });
        })
        .catch(() => utils.onLoadFailure(el));
      }

      // [xishu-custom] 标题映射与评论并行获取；映射加载失败（404/网络异常）时降级为不显示标题
      const titlesPromise = titlesSrc
        ? fetch(titlesSrc).then(res => res.ok ? res.json() : null).catch(() => null)
        : Promise.resolve(null);
      titlesPromise.then(titles => xsRender(titles || {}));
})();
  
