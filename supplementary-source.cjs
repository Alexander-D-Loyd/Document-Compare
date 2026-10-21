'use strict';
// Only the source reviewed for this feature may leave the desktop app.
function isSupplementaryCitationSource(value){
 return typeof value==='string'&&/^https:\/\/sdap\.org\/wp-content\/uploads\/downloads\/Style-Manual\.pdf#page=(?:[1-9]|[1-9]\d|[12]\d\d)$/u.test(value);
}
module.exports={isSupplementaryCitationSource};
