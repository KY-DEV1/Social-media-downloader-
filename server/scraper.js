import axios from 'axios';
import * as cheerio from 'cheerio';

function parseDuration(s) {
  return [s / 3600, s / 60 % 60, s % 60].map(v => Math.floor(v).toString().padStart(2, '0')).join(':');
}

export async function instagramDl(url) {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axios.post(
        'https://yt1s.io/api/ajaxSearch',
        new URLSearchParams({ q: url, w: '', p: 'home', lang: 'en' }),
        {
          headers: {
            'Accept': 'application/json, text/plain, /',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Origin': 'https://yt1s.io',
            'Referer': 'https://yt1s.io/',
            'User-Agent': 'Postify/1.0.0',
          },
        }
      );
      const $ = cheerio.load(data.data);
      let result = $('a.abutton.is-success.is-fullwidth.btn-premium')
        .map((_, b) => ({
          title: $(b).attr('title'),
          url: $(b).attr('href'),
        }))
        .get();
      resolve(result);
    } catch (e) {
      reject(e);
    }
  });
}

export async function tiktokDl(url) {
  return new Promise(async (resolve, reject) => {
    try {
      let data = [];

      function formatNumber(integer) {
        return Number(parseInt(integer)).toLocaleString().replace(/,/g, '.');
      }

      function formatDate(n, locale = 'en') {
        return new Date(n).toLocaleDateString(locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
        });
      }

      const res = (
        await axios.post(
          'https://www.tikwm.com/api/',
          {},
          {
            headers: {
              'Accept': 'application/json, text/javascript, /; q=0.01',
              'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'Origin': 'https://www.tikwm.com',
              'Referer': 'https://www.tikwm.com/',
              'User-Agent': 'Mozilla/5.0',
            },
            params: { url: url, hd: 1 },
          }
        )
      ).data.data;

      if (!res.size && !res.wm_size && !res.hd_size) {
        res.images.map((v) => data.push({ type: 'photo', url: v }));
      } else {
        if (res.wmplay) data.push({ type: 'watermark', url: res.wmplay });
        if (res.play) data.push({ type: 'nowatermark', url: res.play });
        if (res.hdplay) data.push({ type: 'nowatermark_hd', url: res.hdplay });
      }

      resolve({
        ...res,
        status: true,
        title: res.title,
        taken_at: formatDate(res.create_time).replace('1970', ''),
        region: res.region,
        id: res.id,
        durations: res.duration,
        duration: res.duration + ' Seconds',
        cover: res.cover,
        size_wm: res.wm_size,
        size_nowm: res.size,
        size_nowm_hd: res.hd_size,
        data: data,
        music_info: {
          id: res.music_info.id,
          title: res.music_info.title,
          author: res.music_info.author,
          album: res.music_info.album || null,
          url: res.music || res.music_info.play,
        },
        stats: {
          views: formatNumber(res.play_count),
          likes: formatNumber(res.digg_count),
          comment: formatNumber(res.comment_count),
          share: formatNumber(res.share_count),
          download: formatNumber(res.download_count),
        },
        author: {
          id: res.author.id,
          fullname: res.author.unique_id,
          nickname: res.author.nickname,
          avatar: res.author.avatar,
        },
      });
    } catch (e) {
      reject(e);
    }
  });
}

export async function facebookDl(url) {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axios.post(
        'https://getmyfb.com/process',
        new URLSearchParams({
          id: decodeURIComponent(url),
          locale: 'en',
        }),
        {
          headers: {
            'hx-current-url': 'https://getmyfb.com/',
            'hx-request': 'true',
            'hx-target': url.includes('share')
              ? '#private-video-downloader'
              : '#target',
            'hx-trigger': 'form',
            'hx-post': '/process',
            'hx-swap': 'innerHTML',
          },
        }
      );
      const $ = cheerio.load(data);
      resolve({
        caption: $('.results-item-text').text().trim() || '',
        preview: $('.results-item-image').attr('src') || '',
        results: $('.results-list-item')
          .get()
          .map((el) => ({
            quality: parseInt($(el).text().trim()) || '',
            type: $(el).text().includes('HD') ? 'HD' : 'SD',
            url: $(el).find('a').attr('href') || '',
          })),
      });
    } catch (e) {
      reject(e);
    }
  });
}

export class NvlGroup {
  constructor() {
    this.signature = null;
    this.timestamp = null;
  }

  async updateSignature() {
    const res = await axios.get('https://ytdownloader.nvlgroup.my.id/generate-signature');
    this.signature = res.data.signature;
    this.timestamp = res.data.timestamp;
  }

  async ensureSignature() {
    if (!this.signature || !this.timestamp || Date.now() - this.timestamp > 4 * 60 * 1000) {
      await this.updateSignature();
    }
  }

  async search(query) {
    await this.ensureSignature();
    const { data } = await axios.get(`https://ytdownloader.nvlgroup.my.id/web/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'x-server-signature': this.signature,
        'x-signature-timestamp': this.timestamp
      }
    });
    return data;
  }

  async info(url) {
    await this.ensureSignature();
    const { data } = await axios.get(`https://ytdownloader.nvlgroup.my.id/web/info?url=${encodeURIComponent(url)}`, {
      headers: {
        'x-server-signature': this.signature,
        'x-signature-timestamp': this.timestamp
      }
    });
    return data;
  }

  async download(url) {
    await this.ensureSignature();
    const info = await this.info(url);
    const video = info.resolutions.map(res => ({
      ...res,
      url: `https://ytdownloader.nvlgroup.my.id/web/download?url=${url}&resolution=${res.height}&signature=${this.signature}&timestamp=${this.timestamp}`
    }));
    const audio = info.audioBitrates.map(res => ({
      ...res,
      url: `https://ytdownloader.nvlgroup.my.id/web/audio?url=${url}&bitrate=${res.bitrate}&signature=${this.signature}&timestamp=${this.timestamp}`
    }));
    return { info, video, audio };
  }
}