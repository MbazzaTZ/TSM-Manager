interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const Logo = ({ size = "md", showText = true }: LogoProps) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
  };

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className="flex items-center gap-3">
      <img 
        src="/logo-icon.png" 
        alt="TSM Logo" 
        className={`${sizeClasses[size]} object-contain`}
      />
      {showText && (
        <div className="flex flex-col">
          <span className={`${textSizeClasses[size]} font-bold text-foreground leading-tight`}>
            TSM
          </span>
          <span className="text-xs text-muted-foreground font-medium tracking-wide">
            Territory Manager
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
