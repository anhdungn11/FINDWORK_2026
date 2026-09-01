import { Outlet } from "react-router-dom";
const EmployerLayout =()=>{
    return (
        <div>
            <header>
                <h2>FindWork Employer</h2>
            </header>
            <aside>
                <p>Employer Sidebar</p>
            </aside>
            <main>
                <Outlet/>
            </main>
        </div>
    )
}
export default EmployerLayout;