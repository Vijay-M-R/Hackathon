import { Building2 } from "lucide-react";
import { RoleAuth } from "./RoleAuth";
import { Link } from "react-router-dom";

const CompanyLogin = () => (
  <div className="relative">
    <RoleAuth
      role="company"
      title="Recruiter Login"
      subtitle="Access your college partnership portal."
      icon={Building2}
      redirectTo="/company"
      accentLabel="Company"
    />
    <div className="absolute bottom-10 left-0 w-full text-center z-50">
       <p className="text-sm text-muted-foreground">
          Don't have an account? <Link to="/auth/company/signup" className="text-primary font-bold hover:underline">Register your company</Link>
       </p>
    </div>
  </div>
);

export default CompanyLogin;
