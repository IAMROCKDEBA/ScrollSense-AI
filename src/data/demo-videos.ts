import type { VideoItem } from "@/types";

const makeVideo = (
  id: string,
  title: string,
  channelTitle: string,
  thumbnail = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
): VideoItem => ({
  id,
  title,
  channelTitle,
  thumbnail,
  embedUrl: `https://www.youtube.com/embed/${id}`
});

export const demoVideos: VideoItem[] = [
  makeVideo("M7lc1UVf-VE", "Demo embed: YouTube player sample", "YouTube Developers"),
  makeVideo("jNQXAC9IVRw", "Demo embed: short public archive clip", "Public YouTube Archive"),
  makeVideo("ysz5S6PUM-U", "Demo embed: public sample video", "Public Embed Sample"),
  makeVideo("aqz-KE-bpKQ", "Demo embed: creative commons animation", "Public Embed Sample"),
  makeVideo("ScMzIvxBSi4", "Demo embed: visual attention sample", "Public Embed Sample"),
  makeVideo("YE7VzlLtp-4", "Demo embed: short animation sample", "Public Embed Sample"),
  makeVideo("BaW_jenozKc", "Demo embed: developer test clip", "YouTube Developers"),
  makeVideo("Ks-_Mh1QhMc", "Demo embed: public learning clip", "Public Embed Sample")
];
