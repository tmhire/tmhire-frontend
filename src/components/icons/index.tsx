import Image from "next/image";

const PlantIcon = ({ size = 24, ...props }) => (
    <Image src="/icons/plant.svg" alt="plant" width={size} height={size} {...props} />
);
const TmIcon = ({ size = 24, ...props }) => (
    <Image src="/icons/tm.svg" alt="plant" width={size} height={size} {...props} />
);
const PumpIcon = ({ size = 24, ...props }) => (
    <Image src="/icons/pump.svg" alt="plant" width={size} height={size} {...props} />
);

export const Icons = {
    Plant: PlantIcon,
    Tm: TmIcon,
    Pump: PumpIcon,
};
