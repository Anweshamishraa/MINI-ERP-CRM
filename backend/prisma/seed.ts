import {PrismaClient,Role,CustomerType,CustomerStatus,ChallanStatus} from '@prisma/client';
import bcrypt from 'bcrypt';
const p=new PrismaClient();
async function main(){
 const users=[['Admin','admin@example.com','Admin@123',Role.ADMIN],['Sales','sales@example.com','Sales@123',Role.SALES],['Warehouse','warehouse@example.com','Warehouse@123',Role.WAREHOUSE],['Accounts','accounts@example.com','Accounts@123',Role.ACCOUNTS]];
 for(const [name,email,pass,role] of users as any[]) await p.user.upsert({where:{email},update:{},create:{name,email,password:await bcrypt.hash(pass,10),role}});
 await p.customer.createMany({skipDuplicates:true,data:[
  {name:'Amit Sharma',mobile:'9876543210',email:'amit@example.com',businessName:'Sharma Traders',type:CustomerType.WHOLESALE,status:CustomerStatus.ACTIVE,address:'Mumbai'},
  {name:'Priya Das',mobile:'9876500000',email:'priya@example.com',businessName:'Das Distributors',type:CustomerType.DISTRIBUTOR,status:CustomerStatus.LEAD,address:'Bhubaneswar'}
 ]});
 await p.product.createMany({skipDuplicates:true,data:[
  {name:'Laptop',sku:'LAP-001',category:'Electronics',unitPrice:50000,currentStock:20,minStockAlert:5},
  {name:'Keyboard',sku:'KEY-001',category:'Electronics',unitPrice:1500,currentStock:3,minStockAlert:5},
  {name:'Mouse',sku:'MOU-001',category:'Electronics',unitPrice:700,currentStock:50,minStockAlert:10}
 ]});
}
main().finally(()=>p.$disconnect());
