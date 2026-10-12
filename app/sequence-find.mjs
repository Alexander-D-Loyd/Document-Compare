// Exact contiguous token lookup in linear time, including repeated bill text.
export function sequenceFind(haystack,needle){
 if(!needle.length)return 0;
 const prefix=new Uint32Array(needle.length);
 for(let i=1,j=0;i<needle.length;i++){while(j&&needle[i]!==needle[j])j=prefix[j-1];if(needle[i]===needle[j])j++;prefix[i]=j;}
 for(let i=0,j=0;i<haystack.length;i++){while(j&&haystack[i]!==needle[j])j=prefix[j-1];if(haystack[i]===needle[j])j++;if(j===needle.length)return i-j+1;}
 return -1;
}
