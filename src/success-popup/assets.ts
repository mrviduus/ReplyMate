// This file exists solely to make Parcel include HTML and CSS files in the build
// by importing them as entry points

import htmlUrl from '../success-popup.html?url';
import cssUrl from './success-popup.css?url';

// These imports ensure Parcel processes and includes these files
console.log('HTML URL:', htmlUrl);
console.log('CSS URL:', cssUrl);
