import React, { useState } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import {useNavigate } from "react-router-dom";
import { Alert, Spinner } from "react-bootstrap";
import { useUserAuth } from "../context/UserAuthContext";
import { storage} from "../firebase";
import { ref, getDownloadURL,uploadString } from 'firebase/storage'


function LoginFaceAuth(props) {
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
  const [show, setShow] = useState(false);  
  
  //Login
  const { logIn } = useUserAuth();
const email = props.email;
  const handleLogin = async (e) => {
    try {
      await logIn(props.email, props.password);
      
      navigate("/home", {state: 
        {id : email
        }
        }
        ); 
    } catch (err) {
      setLoading(false);
    }
  };
  

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

      
      const base64String = imgSrc.split(',')[1];
      const imgId = props.email.substring(0, props.email.lastIndexOf("@"));
      const fileName = imgId + "-"+ Math.floor(Math.random() * 100000 + 1) + ".jpg";
      const imageRef = ref(storage, `facelogin/${fileName}`);
      

      const userFace = ref(storage,`facedata/${imgId}`);
      
    

      uploadString(imageRef,base64String, "base64", {contentType: 'image/jpeg'})
        .then((snapshot) => {


        getDownloadURL(snapshot.ref).then((urlFirebase) => {
            setImageURL(urlFirebase);

            const config = {
                headers: {
                  "Content-Type": "application/json",
                  "Ocp-Apim-Subscription-Key":
                  process.env.REACT_APP_AZURE_API_KEY,
                },
              }; 
        
            
              const newImage1Details = {
                url: urlFirebase,
              }; 

              getDownloadURL(userFace)
              .then((url) => {
                const newImage2Details = {
                  url: url,
                }; 


                axios
                .post(
                  "https://engagefaceapi.cognitiveservices.azure.com/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false&recognitionModel=recognition_03&returnRecognitionModel=false&detectionModel=detection_02&faceIdTimeToLive=86400",
                  newImage2Details,
                  config
                )
                .then(async (res) => {
                  setuserId(res.data[0].faceId);
                  setStateOfProcess("Processing...");

              axios
                .post(
                  "https://engagefaceapi.cognitiveservices.azure.com/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false&recognitionModel=recognition_03&returnRecognitionModel=false&detectionModel=detection_02&faceIdTimeToLive=86400",
                  newImage1Details,
                  config
                )
                .then(async (response) => {
                  setuserId(response.data[0].faceId);
                  setStateOfProcess("Processing...");
        
                  const newUserLogin = {
                    faceId1: response.data[0].faceId,
                    faceId2: res.data[0].faceId
                    
                    
                  };

                  
                    
        
                  await axios
                    .post(
                      "https://engagefaceapi.cognitiveservices.azure.com/face/v1.0/verify",
                      newUserLogin,
                      config
                    )
                    .then(async (result) => {
                      setStateOfProcess("Please Wait...");
        
                      
        
                      const loginObj = {
                        isIdentical : result.data.isIdentical,
                      };

                     if(loginObj.isIdentical===true)
                       { 
                        handleLogin();
                        
                      }else{
                        setRetake(true);
                        setLoading(false);
                        props.enableModalCloseButton();
                        setStateOfProcess("Face Match Failed. Try again.");
                      }
                         
                      
        
                      console.log(loginObj);
        
                      
                            
                      
                    })
                    .catch(() => {
                      props.enableModalCloseButton();
                      setRetake(true);
                      setLoading(false);
                      setStateOfProcess("Authentication Failed");
                  });
                })
                .catch((err) => {
                  props.enableModalCloseButton();
                  setStateOfProcess("Face not found. Try again.");
                  setRetake(true);
                  setLoading(false);
                  setShow(true);
                  // alert(err.message);
                });
              })
                .catch((err) => {
                  props.enableModalCloseButton();
                  setStateOfProcess("");
                  setRetake(true);
                  setLoading(false);
                  setShow(true);
                  // alert(err.message);
                });
            });
               
              });

              
        
             
            
        }
      );
    
        
 } else {
        props.enableModalCloseButton();
        setStateOfProcess("Camera not found");
        setLoading(false);
        // show ? <Alert className="text-center bg-white text-danger border-0">Camera Not Found</Alert> : null;
        // alert("First You Must Select An Image");
        }

    }


              
  return (
    <div>
      
      {show ? <Alert className="text-center bg-white text-danger border-0">Face Not Detected</Alert> : null}
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
                props.disableModalCloseButton();
                captureImage();
              }}
            >
              Retake
            </button>
          ) : (
            <div> 
              {loading ? <Spinner animation="border" className="mt-2" /> : <button className="btn btn-dark text-light" onClick={captureImage}>
              Login </button>}   
            </div>
      
          )}

          <div>
            <div className="form-group mt-2 mb-2">
              <h5>{StateOfProcess}</h5>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



export default LoginFaceAuth;