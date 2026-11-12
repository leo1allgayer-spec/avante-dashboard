export type ActionCount = { action_type:string; value:string };
export type CreativeInsight = { ad_id:string;ad_name:string;campaign_id:string;campaign_name:string;spend?:string;impressions?:string;clicks?:string;reach?:string;inline_link_clicks?:string;actions?:ActionCount[];video_play_actions?:ActionCount[];video_thruplay_watched_actions?:ActionCount[];video_p25_watched_actions?:ActionCount[];video_p50_watched_actions?:ActionCount[];video_p75_watched_actions?:ActionCount[];video_p100_watched_actions?:ActionCount[];video_avg_time_watched_actions?:ActionCount[] };
const videoValue=(items?:ActionCount[])=>{const v=items?.find(a=>a.action_type==="video_view")?.value??items?.[0]?.value;return v==null?null:Number(v);};
const divide=(n:number|null,d:number|null,scale=1)=>n!=null&&d!=null&&d>0?n/d*scale:null;
export function creativePerformance(row:CreativeInsight) {
 const spend=Number(row.spend||0),impressions=Number(row.impressions||0),clicks=Number(row.clicks||0),reach=Number(row.reach||0);
 const views3=videoValue(row.actions?.filter(a=>a.action_type==="video_view"));
 const plays=videoValue(row.video_play_actions),thru=videoValue(row.video_thruplay_watched_actions),p25=videoValue(row.video_p25_watched_actions),p50=videoValue(row.video_p50_watched_actions),p75=videoValue(row.video_p75_watched_actions),p100=videoValue(row.video_p100_watched_actions);
 return {...row,spend,impressions,clicks,reach,plays,views3,thru,p25,p50,p75,p100,averageSeconds:videoValue(row.video_avg_time_watched_actions),
  ctr:divide(clicks,impressions,100),linkCtr:divide(row.inline_link_clicks==null?null:Number(row.inline_link_clicks),impressions,100),cpc:divide(spend,clicks),cpm:divide(spend,impressions,1000),frequency:divide(impressions,reach),
  hook:divide(views3,impressions,100),hold:divide(thru,views3,100),body:divide(p50,p25,100),completion:divide(p100,plays,100)};
}
