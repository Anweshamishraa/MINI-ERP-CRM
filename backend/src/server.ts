import 'dotenv/config';
import express,{Request,Response,NextFunction} from 'express';
import cors from 'cors'; import bcrypt from 'bcrypt'; import jwt from 'jsonwebtoken';
import {PrismaClient,Role,MovementType,ChallanStatus} from '@prisma/client';
import {z} from 'zod';
const prisma=new PrismaClient(), app=express();
app.use(cors()); app.use(express.json());
const secret=process.env.JWT_SECRET||'dev_secret';

type AuthReq=Request & {user?:{id:string,role:Role,name:string}};
const auth=(req:AuthReq,res:Response,next:NextFunction)=>{try{const t=req.headers.authorization?.split(' ')[1]; if(!t) throw 0; req.user=jwt.verify(t,secret) as any; next()}catch{res.status(401).json({success:false,message:'Unauthorized'})}};
const roles=(...allowed:Role[])=> (req:AuthReq,res:Response,next:NextFunction)=>req.user&&allowed.includes(req.user.role)?next():res.status(403).json({success:false,message:'Forbidden'});
const pageArgs=(req:Request)=>({skip:(Math.max(1,Number(req.query.page)||1)-1)*(Number(req.query.limit)||10),take:Number(req.query.limit)||10});

app.post('/api/auth/login',async(req,res,next)=>{try{const {email,password}=z.object({email:z.string().email(),password:z.string().min(1)}).parse(req.body);const u=await prisma.user.findUnique({where:{email}});if(!u||!await bcrypt.compare(password,u.password)) return res.status(401).json({success:false,message:'Invalid credentials'});const token=jwt.sign({id:u.id,role:u.role,name:u.name},secret,{expiresIn:'8h'});res.json({success:true,data:{token,user:{id:u.id,name:u.name,email:u.email,role:u.role}}})}catch(e){next(e)}});
app.get('/api/auth/me',auth,async(req:AuthReq,res)=>res.json({success:true,data:req.user}));

app.get('/api/dashboard/stats',auth,async(req,res,next)=>{try{const [customers,products,lowStock,pending]=await Promise.all([prisma.customer.count(),prisma.product.count(),prisma.product.count({where:{currentStock:{lte:5}}}),prisma.challan.count({where:{status:ChallanStatus.DRAFT}})]);res.json({success:true,data:{customers,products,lowStock,pending}})}catch(e){next(e)}});

app.get('/api/customers',auth,roles(Role.ADMIN,Role.SALES,Role.ACCOUNTS),async(req,res,next)=>{try{const q=String(req.query.search||'');const {skip,take}=pageArgs(req);const where:any={AND:[q?{OR:[{name:{contains:q,mode:'insensitive'}},{mobile:{contains:q}}]}:{},req.query.type?{type:String(req.query.type)}:{},req.query.status?{status:String(req.query.status)}:{}]};const [data,total]=await Promise.all([prisma.customer.findMany({where,skip,take,orderBy:{createdAt:'desc'}}),prisma.customer.count({where})]);res.json({success:true,data,meta:{total,page:Number(req.query.page)||1,limit:take}})}catch(e){next(e)}});
app.post(
  '/api/customers',
  auth,
  roles(Role.ADMIN,Role.SALES),
  async(req:AuthReq,res,next)=>{
    try{

      const d=z.object({
        name:z.string().min(2),
        mobile:z.string().min(10),
        email:z.string().email().optional().or(z.literal('')),
        businessName:z.string().min(1),
        gstNumber:z.string().optional(),
        type:z.enum(['RETAIL','WHOLESALE','DISTRIBUTOR']),
        status:z.enum(['LEAD','ACTIVE','INACTIVE']).optional(),
        address:z.string().min(1),
        followUpDate:z.string().optional(),
        notes:z.string().optional()
      }).parse(req.body);

      const customer=await prisma.$transaction(async(tx)=>{

        const newCustomer=await tx.customer.create({
          data:{
            name:d.name,
            mobile:d.mobile,
            email:d.email||null,
            businessName:d.businessName,
            gstNumber:d.gstNumber,
            type:d.type,
            status:d.status,
            address:d.address,
            followUpDate:d.followUpDate
              ?new Date(d.followUpDate)
              :null,
            notes:d.notes
          }
        });

        if(d.followUpDate && d.notes){

          await tx.followUp.create({
            data:{
              customerId:newCustomer.id,
              notes:d.notes,
              followUpDate:new Date(d.followUpDate),
              createdById:req.user!.id
            }
          });

        }

        return newCustomer;

      });

      res.status(201).json({
        success:true,
        data:customer
      });

    }catch(e){
      next(e);
    }
  }
);
app.get('/api/customers/:id',auth,roles(Role.ADMIN,Role.SALES,Role.ACCOUNTS),async(req,res,next)=>{try{const d=await prisma.customer.findUnique({where:{id:req.params.id},include:{followUps:{orderBy:{createdAt:'desc'}}}});if(!d)return res.status(404).json({success:false,message:'Customer not found'});res.json({success:true,data:d})}catch(e){next(e)}});
app.put('/api/customers/:id',auth,roles(Role.ADMIN,Role.SALES),async(req,res,next)=>{try{res.json({success:true,data:await prisma.customer.update({where:{id:req.params.id},data:req.body})})}catch(e){next(e)}});
app.delete('/api/customers/:id',auth,roles(Role.ADMIN,Role.SALES),async(req,res,next)=>{try{await prisma.customer.delete({where:{id:req.params.id}});res.json({success:true,message:'Deleted'})}catch(e){next(e)}});
app.post('/api/customers/:id/followups',auth,roles(Role.ADMIN,Role.SALES),async(req:AuthReq,res,next)=>{try{const d=z.object({notes:z.string().min(1),followUpDate:z.string()}).parse(req.body);res.status(201).json({success:true,data:await prisma.followUp.create({data:{customerId:req.params.id,notes:d.notes,followUpDate:new Date(d.followUpDate),createdById:req.user!.id}})})}catch(e){next(e)}});
app.get('/api/followups',auth,roles(Role.ADMIN,Role.SALES),async(req,res,next)=>{try{res.json({success:true,data:await prisma.followUp.findMany({include:{customer:true},orderBy:{followUpDate:'asc'}})})}catch(e){next(e)}});

app.get('/api/products',auth,async(req,res,next)=>{try{const q=String(req.query.search||'');const {skip,take}=pageArgs(req);const where=q?{OR:[{name:{contains:q,mode:'insensitive'}},{sku:{contains:q,mode:'insensitive'}}]}:{};const [data,total]=await Promise.all([prisma.product.findMany({where,skip,take}),prisma.product.count({where})]);res.json({success:true,data,meta:{total}})}catch(e){next(e)}});
app.post('/api/products',auth,roles(Role.ADMIN,Role.WAREHOUSE),async(req,res,next)=>{
  try{
    const d=z.object({
      name:z.string().min(1),
      sku:z.string().min(1),
      category:z.string(),
      location:z.string().optional(),
      unitPrice:z.coerce.number().positive(),
      currentStock:z.coerce.number().int().min(0),
      minStockAlert:z.coerce.number().int().min(0)
    }).parse(req.body);

    res.status(201).json({
      success:true,
      data:await prisma.product.create({data:d})
    });
  }catch(e){
    next(e);
  }
});
app.put('/api/products/:id',auth,roles(Role.ADMIN,Role.WAREHOUSE),async(req,res,next)=>{
  try{
    const d=z.object({
      name:z.string().min(1).optional(),
      sku:z.string().min(1).optional(),
      category:z.string().optional(),
      location:z.string().optional(),
      unitPrice:z.coerce.number().positive().optional(),
      currentStock:z.coerce.number().int().min(0).optional(),
      minStockAlert:z.coerce.number().int().min(0).optional()
    }).parse(req.body);

    const product=await prisma.product.update({
      where:{id:req.params.id},
      data:d
    });

    res.json({success:true,data:product});
  }catch(e){
    next(e);
  }
});
app.post('/api/inventory/movements',
  auth,
  roles(Role.ADMIN,Role.WAREHOUSE),
  async(req:AuthReq,res,next)=>{
    try{
      const d=z.object({
        productId:z.string(),
        quantity:z.coerce.number().int().positive(),
        type:z.enum(['IN','OUT']),
        reason:z.string().min(1)
      }).parse(req.body);

      const product=await prisma.product.findUnique({
        where:{id:d.productId}
      });

      if(!product){
        return res.status(404).json({
          success:false,
          message:'Product not found'
        });
      }

      if(d.type==='OUT' && product.currentStock<d.quantity){
        return res.status(400).json({
          success:false,
          message:'Insufficient stock'
        });
      }

      const newStock =
        d.type==='IN'
          ? product.currentStock+d.quantity
          : product.currentStock-d.quantity;

      const result=await prisma.$transaction(async(tx)=>{

        const updatedProduct=await tx.product.update({
          where:{id:d.productId},
          data:{currentStock:newStock}
        });

        const log=await tx.inventoryLog.create({
          data:{
            productId:d.productId,
            quantity:d.quantity,
            type:d.type as MovementType,
            reason:d.reason,
            createdById:req.user!.id
          }
        });

        return {updatedProduct,log};
      });

      res.status(201).json({
        success:true,
        data:result
      });

    }catch(e){
      next(e);
    }
  }
);
app.get('/api/inventory/movements',
  auth,
  roles(Role.ADMIN,Role.WAREHOUSE),
  async(req,res,next)=>{
    try{
      const data=await prisma.inventoryLog.findMany({
        include:{
          product:true,
          createdBy:{
            select:{
              id:true,
              name:true,
              email:true
            }
          }
        },
        orderBy:{
          createdAt:'desc'
        }
      });

      res.json({
        success:true,
        data
      });

    }catch(e){
      next(e);
    }
  }
);
app.post('/api/challans',
  auth,
  roles(Role.ADMIN,Role.SALES),
  async(req:AuthReq,res,next)=>{
    try{

      const d=z.object({
        customerId:z.string(),
        items:z.array(
          z.object({
            productId:z.string(),
            quantity:z.coerce.number().int().positive()
          })
        ).min(1)
      }).parse(req.body);

      const customer=await prisma.customer.findUnique({
        where:{id:d.customerId}
      });

      if(!customer){
        return res.status(404).json({
          success:false,
          message:'Customer not found'
        });
      }

      const products=await prisma.product.findMany({
        where:{
          id:{
            in:d.items.map(item=>item.productId)
          }
        }
      });

      if(products.length!==d.items.length){
        return res.status(404).json({
          success:false,
          message:'One or more products not found'
        });
      }

      for(const item of d.items){

        const product=products.find(
          p=>p.id===item.productId
        );

        if(!product || product.currentStock<item.quantity){
          return res.status(400).json({
            success:false,
            message:`Insufficient stock for product ${product?.name}`
          });
        }
      }

      const totalAmount=d.items.reduce((total,item)=>{

        const product=products.find(
          p=>p.id===item.productId
        )!;

        return total+
          Number(product.unitPrice)*item.quantity;

      },0);

      const challanNumber=
        `CH-${Date.now()}`;

      const challan=await prisma.$transaction(
        async(tx)=>{

          const newChallan=
            await tx.challan.create({

              data:{
                number:challanNumber,
                customerId:d.customerId,
                totalAmount,

                createdById:req.user!.id,

                items:{
                  create:d.items.map(item=>{

                    const product=products.find(
                      p=>p.id===item.productId
                    )!;

                    return{
                      productId:product.id,
                      productName:product.name,
                      sku:product.sku,
                      unitPrice:product.unitPrice,
                      quantity:item.quantity,

                      lineTotal:
                        Number(product.unitPrice)*
                        item.quantity
                    };

                  })
                }

              },

              include:{
                customer:true,
                items:true
              }

            });

          return newChallan;

        }
      );

      res.status(201).json({
        success:true,
        data:challan
      });

    }catch(e){
      next(e);
    }
  }
);
app.get('/api/challans',
  auth,
  roles(Role.ADMIN,Role.SALES,Role.ACCOUNTS),
  async(req,res,next)=>{
    try{

      const data=await prisma.challan.findMany({

        include:{
          customer:true,
          createdBy:{
            select:{
              id:true,
              name:true,
              email:true
            }
          },
          items:true
        },

        orderBy:{
          createdAt:'desc'
        }

      });

      res.json({
        success:true,
        data
      });

    }catch(e){
      next(e);
    }
  }
);
app.get('/api/challans/:id',
  auth,
  roles(Role.ADMIN,Role.SALES,Role.ACCOUNTS),
  async(req,res,next)=>{
    try{

      const challan=await prisma.challan.findUnique({
        where:{id:req.params.id},
        include:{
          customer:true,
          createdBy:{
            select:{
              id:true,
              name:true,
              email:true
            }
          },
          items:true
        }
      });

      if(!challan){
        return res.status(404).json({
          success:false,
          message:'Challan not found'
        });
      }

      res.json({
        success:true,
        data:challan
      });

    }catch(e){
      next(e);
    }
  }
);
app.put('/api/challans/:id/status',
  auth,
  roles(Role.ADMIN,Role.SALES,Role.ACCOUNTS),
  async(req:AuthReq,res,next)=>{
    try{

      const d=z.object({
        status:z.enum(['DRAFT','CONFIRMED','CANCELLED'])
      }).parse(req.body);

      const challan=await prisma.challan.findUnique({
        where:{id:req.params.id},
        include:{items:true}
      });

      if(!challan){
        return res.status(404).json({
          success:false,
          message:'Challan not found'
        });
      }

      if(
        challan.status===ChallanStatus.DRAFT &&
        d.status==='CONFIRMED'
      ){

        for(const item of challan.items){

          const product=await prisma.product.findUnique({
            where:{id:item.productId}
          });

          if(!product){
            return res.status(404).json({
              success:false,
              message:`Product not found`
            });
          }

          if(product.currentStock<item.quantity){
            return res.status(400).json({
              success:false,
              message:`Insufficient stock for ${product.name}`
            });
          }
        }

        await prisma.$transaction(async(tx)=>{

          for(const item of challan.items){

            const product=await tx.product.update({
              where:{id:item.productId},

              data:{
                currentStock:{
                  decrement:item.quantity
                }
              }
            });

            await tx.inventoryLog.create({
              data:{
                productId:item.productId,
                quantity:item.quantity,
                type:MovementType.OUT,
                reason:`Challan ${challan.number}`,
                challanId:challan.id,
                createdById:req.user!.id
              }
            });

          }

          await tx.challan.update({
            where:{id:challan.id},

            data:{
              status:ChallanStatus.CONFIRMED
            }
          });

        });

      }else{

        await prisma.challan.update({
          where:{id:challan.id},

          data:{
            status:d.status as ChallanStatus
          }
        });

      }

      const updatedChallan=
        await prisma.challan.findUnique({
          where:{id:challan.id},

          include:{
            customer:true,
            items:true
          }
        });

      res.json({
        success:true,
        data:updatedChallan
      });

    }catch(e){
      next(e);
    }
  }
);


app.use((err:any,req:Request,res:Response,next:NextFunction)=>{
  console.error(err);
  res.status(500).json({
    success:false,
    message:'Internal server error'
  });
});

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});