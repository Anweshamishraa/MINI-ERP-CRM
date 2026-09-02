import React,{createContext,useContext,useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,Routes,Route,Navigate,Link,useNavigate} from 'react-router-dom';
import axios from 'axios'; import './style.css';
const api=axios.create({baseURL:import.meta.env.VITE_API_URL||'http://localhost:5000/api'});
type User={id:string;name:string;email:string;role:string}; type Auth={user:User|null;login:(e:string,p:string)=>Promise<void>;logout:()=>void};
const C=createContext<Auth>(null!); const useAuth=()=>useContext(C);
function AuthProvider({children}:{children:React.ReactNode}){const [user,setUser]=useState<User|null>(JSON.parse(localStorage.getItem('user')||'null'));
    useEffect(()=>{const t=localStorage.getItem('token');
    if(t)api.defaults.headers.common.Authorization='Bearer '+t},[]);
    const login=async(email:string,password:string)=>{const r=await api.post('/auth/login',{email,password});
    localStorage.setItem('token',r.data.data.token);
    localStorage.setItem('user',JSON.stringify(r.data.data.user));
    api.defaults.headers.common.Authorization='Bearer '+r.data.data.token;setUser(r.data.data.user)};
    const logout=()=>{localStorage.clear();
        delete api.defaults.headers.common.Authorization;setUser(null)};
        return <C.Provider value={{user,login,logout}}>{children}</C.Provider>}
function Login(){const a=useAuth(),n=useNavigate(),[email,setE]=useState('admin@example.com'),[password,setP]=useState('Admin@123'),[err,setErr]=useState('');return <main className="login"><form onSubmit={async e=>{e.preventDefault();try{await a.login(email,password);n('/')}catch(x:any){setErr(x.response?.data?.message||'Login failed')}}}><h1>Mini ERP + CRM</h1><input aria-label="Email" value={email} onChange={e=>setE(e.target.value)}/><input aria-label="Password" type="password" value={password} onChange={e=>setP(e.target.value)}/><button>Login</button>{err&&<p className="error">{err}</p>}<small>Admin: admin@example.com / Admin@123</small></form></main>}
const allowed=(roles:string[])=>{const u=useAuth().user;return !!u&&roles.includes(u.role)}
function Layout({children}:{children:React.ReactNode}){const {user,logout}=useAuth();return <div className="app"><aside><h2>ERP CRM</h2><Link to="/">Dashboard</Link>{allowed(['ADMIN','SALES','ACCOUNTS'])&&<Link to="/customers">Customers</Link>}<Link to="/products">Products</Link>{allowed(['ADMIN','WAREHOUSE'])&&<Link to="/inventory">Inventory</Link>}<Link to="/challans">Challans</Link>{allowed(['ADMIN','SALES'])&&<Link to="/followups">Follow-ups</Link>}<button onClick={logout}>Logout</button></aside><section><header>{user?.name} <span>{user?.role}</span></header>{children}</section></div>}
function Dashboard(){const [d,setD]=useState<any>({});useEffect(()=>{api.get('/dashboard/stats').then(r=>setD(r.data.data))},[]);return <Layout><h1>Dashboard</h1><div className="cards">{Object.entries(d).map(([k,v])=><div className="card" key={k}><b>{String(v)}</b><span>{k}</span></div>)}</div></Layout>}
function Customers(){
const [data,setData]=useState<any[]>([]);
const [search,setSearch]=useState('');
const [showForm,setShowForm]=useState(false);

const [form,setForm]=useState({
name:'',
mobile:'',
email:'',
businessName:'',
gstNumber:'',
type:'RETAIL',
status:'ACTIVE',
address:'',
followUpDate:'',
notes:''
});

const load=()=>{
api.get('/customers',{params:{search}})
.then(r=>setData(r.data.data))
.catch(err=>console.error(err));
};

useEffect(()=>{
const t=setTimeout(load,300);
return()=>clearTimeout(t);
},[search]);

const submit=async(e:any)=>{
e.preventDefault();

try{
await api.post('/customers',form);

alert('Customer added successfully');

setForm({
name:'',
mobile:'',
email:'',
businessName:'',
gstNumber:'',
type:'RETAIL',
status:'ACTIVE',
address:'',
followUpDate:'',
notes:''
});

setShowForm(false);
load();

}catch(err:any){
alert(err.response?.data?.message || 'Failed to add customer');
}
};

return <Layout>

<h1>Customers</h1>

<button onClick={()=>setShowForm(!showForm)}>
{showForm?'Cancel':'Add Customer'}
</button>

<br/><br/>

<input
placeholder="Search customer"
value={search}
onChange={e=>setSearch(e.target.value)}
/>

{showForm &&

<form onSubmit={submit}>

<h2>Add Customer</h2>

<input
placeholder="Name"
value={form.name}
onChange={e=>setForm({...form,name:e.target.value})}
/>

<input
placeholder="Mobile"
value={form.mobile}
onChange={e=>setForm({...form,mobile:e.target.value})}
/>

<input
placeholder="Email"
value={form.email}
onChange={e=>setForm({...form,email:e.target.value})}
/>

<input
placeholder="Business Name"
value={form.businessName}
onChange={e=>setForm({...form,businessName:e.target.value})}
/>

<input
placeholder="GST Number"
value={form.gstNumber}
onChange={e=>setForm({...form,gstNumber:e.target.value})}
/>

<select
value={form.type}
onChange={e=>setForm({...form,type:e.target.value})}
>
<option value="RETAIL">Retail</option>
<option value="WHOLESALE">Wholesale</option>
<option value="DISTRIBUTOR">Distributor</option>
</select>

<select
value={form.status}
onChange={e=>setForm({...form,status:e.target.value})}
>
<option value="LEAD">Lead</option>
<option value="ACTIVE">Active</option>
<option value="INACTIVE">Inactive</option>
</select>

<input
placeholder="Address"
value={form.address}
onChange={e=>setForm({...form,address:e.target.value})}
/>

<label>Follow-up Date</label>

<input
type="date"
value={form.followUpDate}
onChange={e=>setForm({...form,followUpDate:e.target.value})}
/>

<textarea
placeholder="Notes"
value={form.notes}
onChange={e=>setForm({...form,notes:e.target.value})}
/>

<br/><br/>

<button type="submit">
Save Customer
</button>

</form>

}

<br/><br/>

<table>

<thead>

<tr>
<th>Name</th>
<th>Mobile</th>
<th>Business</th>
<th>Type</th>
<th>Status</th>
</tr>

</thead>

<tbody>

{data.map(x=>

<tr key={x.id}>
<td>{x.name}</td>
<td>{x.mobile}</td>
<td>{x.businessName}</td>
<td>{x.type}</td>
<td>{x.status}</td>
</tr>

)}

</tbody>

</table>

</Layout>
}
function Products(){const [data,setData]=useState<any[]>([]);useEffect(()=>{api.get('/products').then(r=>setData(r.data.data))},[]);return <Layout><h1>Products</h1><table><thead><tr><th>Name</th><th>SKU</th><th>Price</th><th>Stock</th><th>Alert</th></tr></thead><tbody>{data.map(x=><tr className={x.currentStock<=x.minStockAlert?'low':''} key={x.id}><td>{x.name}</td><td>{x.sku}</td><td>₹{x.unitPrice}</td><td>{x.currentStock}</td><td>{x.minStockAlert}</td></tr>)}</tbody></table></Layout>}
function Challans(){const [data,setData]=useState<any[]>([]);useEffect(()=>{api.get('/challans').then(r=>setData(r.data.data))},[]);return <Layout><h1>Sales Challans</h1><table><thead><tr><th>Number</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead><tbody>{data.map(x=><tr key={x.id}><td>{x.number}</td><td>{x.customer.name}</td><td>₹{x.totalAmount}</td><td>{x.status}</td></tr>)}</tbody></table></Layout>}

function Inventory(){
const [data,setData]=useState<any[]>([]);
const [loading,setLoading]=useState(true);

useEffect(()=>{
api.get('/inventory/movements')
.then(r=>setData(r.data.data))
.catch(err=>console.error(err))
.finally(()=>setLoading(false));
},[]);

return <Layout>
<h1>Inventory Management</h1>
{loading ? <p>Loading inventory movements...</p> :
<table>
<thead>
<tr>
<th>Product</th>
<th>Quantity</th>
<th>Type</th>
<th>Reason</th>
<th>Date</th>
</tr>
</thead>
<tbody>
{data.map(x=>
<tr key={x.id}>
<td>{x.product?.name || x.productId}</td>
<td>{x.quantity}</td>
<td>{x.type}</td>
<td>{x.reason}</td>
<td>{new Date(x.createdAt).toLocaleString()}</td>
</tr>
)}
</tbody>
</table>}
</Layout>
}
function FollowUps(){
const [data,setData]=useState<any[]>([]);
const [loading,setLoading]=useState(true);

useEffect(()=>{
api.get('/followups')
.then(r=>setData(r.data.data))
.catch(err=>console.error(err))
.finally(()=>setLoading(false));
},[]);

return <Layout>
<h1>Follow-ups</h1>

{loading ? <p>Loading follow-ups...</p> :
<table>
<thead>
<tr>
<th>Customer</th>
<th>Mobile</th>
<th>Notes</th>
<th>Follow-up Date</th>
</tr>
</thead>
<tbody>
{data.map(x=>
<tr key={x.id}>
<td>{x.customer?.name}</td>
<td>{x.customer?.mobile}</td>
<td>{x.notes}</td>
<td>{new Date(x.followUpDate).toLocaleString()}</td>
</tr>
)}
</tbody>
</table>}
</Layout>
}
function Simple({title}:{title:string}){return <Layout><h1>{title}</h1><p>Module available according to role permissions. Backend APIs are implemented.</p></Layout>}
function Guard({children}:{children:React.ReactNode}){return useAuth().user?<>{children}</>:<Navigate to="/login"/>}
function App(){return <Routes>
  <Route path="/login" element={<Login/>}/>
  <Route path="/" element={<Guard><Dashboard/></Guard>}/>
  <Route path="/customers" element={<Guard><Customers/></Guard>}/>
  <Route path="/products" element={<Guard><Products/></Guard>}/>
  <Route path="/challans" element={<Guard><Challans/></Guard>}/>
  <Route path="/inventory" element={<Guard><Inventory/></Guard>}/>
  <Route path="/followups" element={<Guard><FollowUps/></Guard>}/>
</Routes>}

createRoot(document.getElementById('root')!).render(
  <BrowserRouter><AuthProvider><App/></AuthProvider></BrowserRouter>
);