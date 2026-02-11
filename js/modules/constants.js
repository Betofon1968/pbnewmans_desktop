// Static domain constants extracted from App.js

export const initialRoutes=[];
export const MAX_PALLETS=20;
export const MIN_PALLETS=1;
export const defaultDriverColors={'':{bg:'#f5f5f5',border:'#9e9e9e',header:'#757575'}};
export const initialStoresDirectory=[];
export const initialDriversDirectory=[];
export const initialTrucksDirectory=[];
export const truckZones=['Zone A','Zone B','Zone C','Zone D'];
export const truckMakes=['Freightliner','Peterbilt','Kenworth','Volvo','Mack','International'];
export const truckStatuses=['Active','In Maintenance','Out of Service'];
export const trailerMakes=['Utility','Great Dane','Wabash','Hyundai','Stoughton','Vanguard'];
export const trailerTypes=['Dry Van','Refrigerated','Flatbed','Tanker'];
export const states=['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];
export const trailerSizes=["None","38'","48'","53'"];
export const licenseTypes=['CDL-A','CDL-B','CDL-C'];
export const driverStatuses=['Active','Inactive','On Leave'];
export const rolePermissions={Admin:{tabs:{Overview:'edit',Drivers:'edit',Stores:'edit',Trucks:'edit','AI Logistics':'edit',Accounts:'edit',Reports:'view',Settings:'edit'},actions:{editPastRoutes:true,deleteRoutes:true,generateBOL:true,exportData:true,manageUsers:true}},Manager:{tabs:{Overview:'edit',Drivers:'edit',Stores:'edit',Trucks:'edit','AI Logistics':'edit',Accounts:'view',Reports:'view',Settings:'view'},actions:{editPastRoutes:true,deleteRoutes:true,generateBOL:true,exportData:true,manageUsers:false}},Dispatcher:{tabs:{Overview:'edit',Drivers:'view',Stores:'view',Trucks:'view','AI Logistics':'edit',Accounts:'none',Reports:'view',Settings:'none'},actions:{editPastRoutes:false,deleteRoutes:false,generateBOL:true,exportData:true,manageUsers:false}},Driver:{tabs:{Overview:'view',Drivers:'none',Stores:'none',Trucks:'none','AI Logistics':'none',Accounts:'none',Reports:'none',Settings:'none'},actions:{editPastRoutes:false,deleteRoutes:false,generateBOL:true,exportData:false,manageUsers:false}},Viewer:{tabs:{Overview:'view',Drivers:'view',Stores:'view',Trucks:'view','AI Logistics':'view',Accounts:'none',Reports:'view',Settings:'none'},actions:{editPastRoutes:false,deleteRoutes:false,generateBOL:false,exportData:true,manageUsers:false}}};
export const initialPalletTypes=[];
