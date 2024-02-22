import React from "react";

const BackgroundImageComponent = ({
  imageUrl,
  children,
}: {
  imageUrl: string;
  children?: React.ReactNode;
}) => {
  const divStyle = {
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    width: "100%",
    height: "100vh",
  };

  return <div style={divStyle}>{children}</div>;
};

export default BackgroundImageComponent;
