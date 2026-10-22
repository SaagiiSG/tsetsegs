import cloudsFar from "@/assets/landing/05-clouds-far.svg";
import cloudsMid from "@/assets/landing/06-clouds-mid.svg";
import cloudsNear from "@/assets/landing/07-clouds-near.svg";

export const Clouds = () => (
  <div className="lv-clouds" aria-hidden>
    <img src={cloudsFar} alt="" className="bottom-10 opacity-70" />
    <img src={cloudsMid} alt="" className="bottom-0 opacity-90" />
    <img src={cloudsNear} alt="" className="-bottom-6" />
  </div>
);
