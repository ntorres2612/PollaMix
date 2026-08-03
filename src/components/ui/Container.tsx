interface ContainerProps {
  children: React.ReactNode;
}

export default function Container({ children }: ContainerProps) {
  return (
    <div className="max-w-7xl mx-auto px-6">
      {children}
    </div>
  );
}