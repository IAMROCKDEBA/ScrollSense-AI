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
  makeVideo("M7lc1UVf-VE", "Demo short-video placeholder: mindful tech use", "YouTube Developers"),
  makeVideo("jNQXAC9IVRw", "Demo video: quick curiosity clip", "YouTube Archive"),
  makeVideo("dQw4w9WgXcQ", "Demo video: attention check clip", "Public Embed Demo"),
  makeVideo("ysz5S6PUM-U", "Demo video: study break sample", "Public Embed Demo"),
  makeVideo("aqz-KE-bpKQ", "Demo video: creative commons sample", "Public Embed Demo"),
  makeVideo("ScMzIvxBSi4", "Demo video: focus reset sample", "Public Embed Demo"),
  makeVideo("kJQP7kiw5Fk", "Demo video: high-stimulus sample", "Public Embed Demo"),
  makeVideo("fJ9rUzIMcZQ", "Demo video: session behavior sample", "Public Embed Demo")
];
