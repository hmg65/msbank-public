import React, { useState } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Alert, Spinner } from "react-bootstrap";
import { storage } from "../firebase";
import { ref, getDownloadURL, uploadString } from "firebase/storage";
import { useUserAuth } from "../context/UserAuthContext";
import UserDataService from "../services/user.services";
import { data } from "jquery";

function RegisterFaceAuth(props) {
  //states for webcam
  const webcamRef = React.useRef(null);
  const [imgSrc, setImgSrc] = React.useState("");

  const navigate = useNavigate();
  //states for send image to firebase
  const [imageURL, setImageURL] = useState("");

  const [retake, setRetake] = useState(false);

  //states for send backend data
  const [userId, setuserId] = useState("");
  const [StateOfProcess, setStateOfProcess] = useState("");

  //Spinner states
  const [loading, setLoading] = useState(false);

  //Message states
  const [show, setShow] = useState(false);

  const password = "engage@1234";
  const balance = 10000;
  const email = props.email;
  const firstName = props.firstName;
  const lastName = props.lastName;
  const mobileNumber = props.mobileNumber;
  const { signUp } = useUserAuth();

  const id = "MSB" + Math.floor(100000 + Math.random() * 900000);
  const account_no = parseInt(Math.floor(10e10 + Math.random() * 900000000));

  const dateCreated = new Date().toISOString();
  const dateUpdated = new Date().toISOString();

  //method for capture an image Destop
  const captureImage = React.useCallback(async () => {
    const imageSrc = await webcamRef.current.getScreenshot();
    // setRetake(true);
    props.disableModalCloseButton();
    setShow(false);
    setLoading(true);
    setImgSrc(imageSrc);
    uploadImage(imageSrc);
  }, [webcamRef, setImgSrc]);

  async function uploadImage(imgSrc) {
    if (imgSrc !== null) {
      setStateOfProcess("Uploading...");
      const imgId = props.email.substring(0, props.email.lastIndexOf("@"));
      const fileName = imgId;

      const base64String = imgSrc.split(",")[1];
      const imageRef = ref(storage, `facedata/${fileName}`);

      uploadString(imageRef, base64String, "base64", {
        contentType: "image/jpeg",
      }).then((snapshot) => {
        setStateOfProcess("Processing...");

        getDownloadURL(snapshot.ref).then((urlFirebase) => {
          setImageURL(urlFirebase);

          const config = {
            headers: {
              "Content-Type": "application/json",
              "Ocp-Apim-Subscription-Key": process.env.REACT_APP_AZURE_API_KEY,
            },
          };

          const newImageDetails = {
            url: urlFirebase,
          };

          axios
            .post(
              "https://engagefaceapi.cognitiveservices.azure.com/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false&recognitionModel=recognition_03&returnRecognitionModel=false&detectionModel=detection_02&faceIdTimeToLive=86400",
              newImageDetails,
              config
            )
            .then(async (response) => {
              setuserId(response.data[0].faceId);

              if (response.data.length === 1) {
                const newUser = {
                  dateCreated,
                  dateUpdated,
                  firstName,
                  lastName,
                  email,
                  mobileNumber,
                  id,
                  account_no,
                  balance,
                };

                await signUp(email, password);
                await UserDataService.addUsers(newUser);

                navigate("/");
              } else {
                if (response.data.length > 1) {
                  props.enableModalCloseButton();
                  setStateOfProcess("Multiple Face Found. Please try again.");
                  setRetake(true);
                  setLoading(false);
                  setShow(true);
                }
              }
            })
            .catch((err) => {
              props.enableModalCloseButton();
              setStateOfProcess("Face not found. Try again.");
              setRetake(true);
              setLoading(false);
              setShow(true);
              // alert(err.message);
            });
        });
      });
    } else {
      props.enableModalCloseButton();
      alert("First You Must Select An Image");
    }
  }

  return (
    <div>
      {show ? (
        <Alert className="text-center bg-white text-danger border-0">
          Face Not Detected
        </Alert>
      ) : null}

      <div className="row text-center">
        <div className="col-md-12">
          {loading ? (
            <img src={imgSrc} className="webcam" />
          ) : (
            <Webcam
              audio={false}
              mirrored={true}
              ref={webcamRef}
              className="webcam webcam_video_size"
              screenshotFormat="image/jpeg"
            />
          )}
        </div>
        <div className="col-md-12">
          {retake ? (
            <button
              className="btn btn-dark text-light"
              onClick={() => {
                setRetake(false);
                captureImage();
              }}
            >
              Retake
            </button>
          ) : (
            <div>
              {" "}
              <br />
              {loading ? (
                <Spinner animation="border" className="mt-2" />
              ) : (
                <button
                  className="btn btn-dark text-light"
                  onClick={captureImage}
                >
                  Capture & Upload Image{" "}
                </button>
              )}
            </div>
          )}

          <div>
            <div className="form-group mt-2 mb-2">
              <h5>{StateOfProcess}</h5>
            </div>
            {/* <div class="form-group">
              <Progress percentage= {uploadPercentage} />
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterFaceAuth;
